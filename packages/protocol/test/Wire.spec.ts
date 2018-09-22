import { waitExpectations, delay, createTestWires } from './test-utils';
import DownstreamWire from '../src/DownstreamWire';
import UpstreamWire from '../src/UpstreamWire';

describe('Up/Down stream wire', () => {
  let client: DownstreamWire, server: UpstreamWire;
  const listener = jest.fn();

  beforeEach(async () => {
    const res = await createTestWires();
    client = res.client;
    server = res.server;
    client.setupListeners();
    server.setupListeners();
    listener.mockClear();
  });

  test('add_torrent', async () => {
    server.on('add_torrent', listener);
    client.emit('add_torrent', Buffer.from('01A4', 'hex'));
    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith(Buffer.from('01A4', 'hex'));
    });
  });
});
