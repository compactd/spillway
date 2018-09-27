"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socketIO = require("socket.io");
const jwtAuth = require("socketio-jwt-auth");
const torrent_client_1 = require("@spillway/torrent-client");
const protocol_1 = require("@spillway/protocol");
const logger_1 = require("./logger");
class SpillwayServer {
    constructor(opts, client = new torrent_client_1.TorrentClient()) {
        this.opts = opts;
        this.client = client;
        this.connectedPeers = [];
    }
    listen() {
        this.io = socketIO({ port: this.opts.port });
        this.io.use((req, next) => {
            logger_1.log('app %O', req);
            next();
        });
        this.io.use(jwtAuth.authenticate({
            secret: this.opts.secret,
        }, ({ hi, hn }, done) => {
            if (!this.connectedPeers.find(({ id }) => id === hi)) {
                this.connectedPeers.push({
                    id: hi,
                    name: hn,
                });
            }
            done(null, {});
        }));
        this.io.on('connection', socket => {
            new protocol_1.UpstreamWire(socket, this.client);
        });
        this.io.listen(this.opts.port);
    }
    destroy() {
        if (!this.io)
            return;
        this.io.close();
    }
}
exports.default = SpillwayServer;
