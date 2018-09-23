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

  test('getState', async () => {
    const getState = jest.fn().mockResolvedValueOnce(['foo']);
    const { client, server, socket } = await createTestWires({ getState });

    const state = await client.getState();

    expect(getState).toHaveBeenCalledTimes(1);
    expect(state).toEqual(['foo']);
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
});
