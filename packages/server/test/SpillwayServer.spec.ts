import SpillwayServer from '../src/SpillwayServer';
import * as io from 'socket.io-client';
import { sign } from 'jsonwebtoken';
import { DownstreamWire } from '@spillway/protocol';

const waitForExpect = require('wait-for-expect') as (
  fn: () => void,
) => Promise<void>;

describe('SpillwayServer', () => {
  const addTorrent = jest.fn();
  const server = new SpillwayServer(
    {
      port: 5979,
      secret: 'foobar',
    },
    { addTorrent } as any,
  );
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.destroy();
  });

  test('refuses to connect with invalid token', async () => {
    const onerror = jest.fn();
    const onsuccess = jest.fn();
    const socket = io('http://localhost:5979', {
      query: 'auth_token=FOOBAR',
    });

    socket.on('error', onerror);
    socket.on('connect', onsuccess);
    socket.connect();

    await waitForExpect(() => {
      expect(onerror).toHaveBeenCalledWith(
        'Error: Not enough or too many segments',
      );
    });

    expect(onsuccess).toHaveBeenCalledTimes(0);
    expect(socket.connected).toBe(false);
  });

  test('connect with valid token', async () => {
    const onerror = jest.fn();
    const onsuccess = jest.fn();
    const socket = io('http://localhost:5979', {
      query: 'auth_token=' + sign({ hi: 'fiff', hn: 'covfefe' }, 'foobar'),
    });

    socket.on('error', onerror);
    socket.on('connection', onsuccess);
    socket.connect();

    await waitForExpect(() => {
      expect(socket.connected).toBe(true);
    });
    expect(onerror).toHaveBeenCalledTimes(0);
  });

  test('doesnt let us use add_torrent without auth', async () => {
    const socket = io('http://localhost:5979', {
      query: 'auth_token=FOOBAR',
    });

    const wire = new DownstreamWire(socket);

    wire.addTorrent(Buffer.alloc(2));

    await new Promise(r => setTimeout(r, 250));

    expect(addTorrent).toHaveBeenCalledTimes(0);
  });

  test('let us add a torrent with auth', async () => {
    const socket = io('http://localhost:5979', {
      query: 'auth_token=' + sign({ hi: 'fiff', hn: 'covfefe' }, 'foobar'),
    });

    const wire = new DownstreamWire(socket);

    wire.addTorrent(Buffer.alloc(2));

    await waitForExpect(() => {
      expect(addTorrent).toHaveBeenCalledWith(Buffer.alloc(2));
    });
  });
});
