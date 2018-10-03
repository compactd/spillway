import { waitExpectations, delay, createTestWires } from './test-utils';
import DownstreamWire from '../src/DownstreamWire';
import UpstreamWire from '../src/UpstreamWire';

describe('Up/Down stream wire', () => {
  test('addTorrent', async () => {
    const addTorrent = jest.fn();
    const { client, server, socket } = await createTestWires({ addTorrent });

    client.addTorrent(Buffer.from('foo'));

    await waitExpectations(() => {
      expect(addTorrent).toHaveBeenCalledTimes(1);
      expect(addTorrent).toHaveBeenCalledWith(Buffer.from('foo'));
    });

    socket.close();
  });

  test('getPiece', async () => {
    const getPiece = jest.fn().mockResolvedValueOnce(['foo']);
    const { client, server, socket } = await createTestWires({ getPiece });

    const state = await client.getPiece('foo', 5);

    expect(getPiece).toHaveBeenCalledTimes(1);
    expect(getPiece).toHaveBeenCalledWith('foo', 5);
    expect(state).toEqual(['foo']);
    socket.close();
  });

  test('handleAppEvent', async () => {
    let callback: (args: any) => {};

    const onAppEvent = jest.fn((name, cb) => {
      expect(name).toBe('torrent_added');
      callback = cb;
    });

    const handler = jest.fn();
    const { client, server, socket } = await createTestWires({ onAppEvent });

    client.handleAppEvent('torrent_added', handler);

    await waitExpectations(() => {
      expect(onAppEvent).toHaveBeenCalledTimes(1);
    });

    callback('foobar');

    await waitExpectations(() => {
      expect(handler).toHaveBeenCalledWith('foobar');
    });

    socket.close();
  });

  test('handleTorrentEvent', async () => {
    let callback: (args: any) => {};

    const onTorrentEvent = jest.fn((hash, name, cb) => {
      expect(name).toBe('state_updated');
      expect(hash).toBe('foo');
      callback = cb;
    });

    const handler = jest.fn();
    const { client, server, socket } = await createTestWires({
      onTorrentEvent,
    });

    client.handleTorrentEvent('foo', 'state_updated', handler);

    await waitExpectations(() => {
      expect(onTorrentEvent).toHaveBeenCalledTimes(1);
    });

    callback('foobar');

    await waitExpectations(() => {
      expect(handler).toHaveBeenCalledWith('foobar');
    });

    socket.close();
  });
});
