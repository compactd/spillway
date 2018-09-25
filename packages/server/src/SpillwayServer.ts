import * as socketIO from 'socket.io';
import * as jwtAuth from 'socketio-jwt-auth';
import { TorrentClient } from '@spillway/torrent-client';
import { UpstreamWire } from '@spillway/protocol';

export default class SpillwayServer {
  private io?: socketIO.Server;
  private connectedPeers: {
    name: string;
    id: string;
  }[] = [];

  constructor(
    private opts: {
      port: number;
      secret: string;
    },
    private client = new TorrentClient(),
  ) {}

  listen() {
    this.io = socketIO({ port: this.opts.port });

    this.io.use(
      jwtAuth.authenticate(
        {
          secret: this.opts.secret,
        },
        ({ hi, hn }, done) => {
          if (!this.connectedPeers.find(({ id }) => id === hi)) {
            this.connectedPeers.push({
              id: hi,
              name: hn,
            });
          }
          done(null, {});
        },
      ),
    );

    this.io.on('connection', socket => {
      new UpstreamWire(socket, this.client);
    });

    this.io.listen(this.opts.port);
  }

  destroy() {
    if (!this.io) return;
    this.io.close();
  }
}
