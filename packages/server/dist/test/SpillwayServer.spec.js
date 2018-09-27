"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const SpillwayServer_1 = require("../src/SpillwayServer");
const io = require("socket.io-client");
const jsonwebtoken_1 = require("jsonwebtoken");
const protocol_1 = require("@spillway/protocol");
const waitForExpect = require('wait-for-expect');
describe('SpillwayServer', () => {
    const addTorrent = jest.fn();
    const server = new SpillwayServer_1.default({
        port: 5979,
        secret: 'foobar',
    }, { addTorrent });
    beforeAll(() => {
        server.listen();
    });
    afterAll(() => {
        server.destroy();
    });
    test('refuses to connect with invalid token', () => __awaiter(this, void 0, void 0, function* () {
        const onerror = jest.fn();
        const onsuccess = jest.fn();
        const socket = io('http://localhost:5979', {
            query: 'auth_token=FOOBAR',
        });
        socket.on('error', onerror);
        socket.on('connect', onsuccess);
        socket.connect();
        yield waitForExpect(() => {
            expect(onerror).toHaveBeenCalledWith('Error: Not enough or too many segments');
        });
        expect(onsuccess).toHaveBeenCalledTimes(0);
        expect(socket.connected).toBe(false);
    }));
    test('connect with valid token', () => __awaiter(this, void 0, void 0, function* () {
        const onerror = jest.fn();
        const onsuccess = jest.fn();
        const socket = io('http://localhost:5979', {
            query: 'auth_token=' + jsonwebtoken_1.sign({ hi: 'fiff', hn: 'covfefe' }, 'foobar'),
        });
        socket.on('error', onerror);
        socket.on('connection', onsuccess);
        socket.connect();
        yield waitForExpect(() => {
            expect(socket.connected).toBe(true);
        });
        expect(onerror).toHaveBeenCalledTimes(0);
    }));
    test('doesnt let us use add_torrent without auth', () => __awaiter(this, void 0, void 0, function* () {
        const socket = io('http://localhost:5979', {
            query: 'auth_token=FOOBAR',
        });
        const wire = new protocol_1.DownstreamWire(socket);
        wire.addTorrent(Buffer.alloc(2));
        yield new Promise(r => setTimeout(r, 250));
        expect(addTorrent).toHaveBeenCalledTimes(0);
    }));
    test('let us add a torrent with auth', () => __awaiter(this, void 0, void 0, function* () {
        const socket = io('http://localhost:5979', {
            query: 'auth_token=' + jsonwebtoken_1.sign({ hi: 'fiff', hn: 'covfefe' }, 'foobar'),
        });
        const wire = new protocol_1.DownstreamWire(socket);
        wire.addTorrent(Buffer.alloc(2));
        yield waitForExpect(() => {
            expect(addTorrent).toHaveBeenCalledWith(Buffer.alloc(2));
        });
    }));
});
