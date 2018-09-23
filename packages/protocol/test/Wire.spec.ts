import { waitExpectations, delay, createTestWires } from './test-utils';
import DownstreamWire from '../src/DownstreamWire';
import UpstreamWire from '../src/UpstreamWire';

describe('Up/Down stream wire', () => {
  let client: DownstreamWire, server: UpstreamWire, close: () => void;
  const listener = jest.fn();

  beforeEach(async () => {
    const res = await createTestWires();
    client = res.client;
    server = res.server;
    close = res.close;

    client.setupListeners();
    server.setupListeners();
    listener.mockClear();
  });

  afterEach(() => {
    client.close();
    if (close) {
      close();
    }
  });

  test('add_torrent', async () => {
    server.on('add_torrent', listener);
    client.emit('add_torrent', Buffer.from('01A4', 'hex'));
    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith(Buffer.from('01A4', 'hex'));
    });
  });
  test('pause_torrent', async () => {
    server.on('pause_torrent', listener);
    client.emit('pause_torrent', 'foo');
    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith('foo');
    });
  });
  test('resume_torrent', async () => {
    server.on('resume_torrent', listener);
    client.emit('resume_torrent', 'foo');
    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith('foo');
    });
  });
  test('remove_torrent', async () => {
    server.on('remove_torrent', listener);
    client.emit('remove_torrent', 'foo');
    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith('foo');
    });
  });

  test('torrent_added', async () => {
    client.on('torrent_added', listener);
    server.emit('torrent_added', {
      name: 'foobar',
      infoHash: 'foo',
    });
    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith({
        name: 'foobar',
        infoHash: 'foo',
      });
    });
  });

  test('subscribe_to without pieceState', async () => {
    client.on('torrent_state_update', listener);
    client.emit('subscribe_to', {
      infoHash: 'foo',
      piecesState: false,
    });
    await delay(250);
    server.emit('torrent_state_update', {
      infoHash: 'foo',
      state: 'STATE' as any,
    });
    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith({
        infoHash: 'foo',
        state: 'STATE' as any,
      });
    });

    listener.mockClear();

    server.emit('torrent_state_update', {
      infoHash: 'foobar',
      state: 'STATE' as any,
    });

    await delay(250);

    expect(listener).toHaveBeenCalledTimes(0);
  });

  test('subscribe_to with pieceState', async () => {
    const pieceAvailable = jest.fn();

    client.on('torrent_state_update', listener);
    client.on('piece_available', pieceAvailable);

    client.emit('subscribe_to', {
      infoHash: 'foo',
      piecesState: true,
    });

    await delay(250);

    server.emit('torrent_state_update', {
      infoHash: 'foo',
      state: 'STATE' as any,
    });

    server.emit('piece_available', {
      infoHash: 'bar',
      pieces: [42],
    });

    server.emit('piece_available', {
      infoHash: 'foo',
      pieces: [4, 2, 0],
    });

    await waitExpectations(() => {
      expect(listener).toHaveBeenCalledWith({
        infoHash: 'foo',
        state: 'STATE' as any,
      });
      expect(pieceAvailable).toHaveBeenCalledWith({
        infoHash: 'foo',
        pieces: [4, 2, 0],
      });
      expect(pieceAvailable).toHaveBeenCalledTimes(1);
    });

    listener.mockClear();

    server.emit('torrent_state_update', {
      infoHash: 'foobar',
      state: 'STATE' as any,
    });

    await delay(250);

    expect(listener).toHaveBeenCalledTimes(0);
  });

  test('download_piece', async () => {
    const downloadPiece = jest.fn();
    const pieceReceived = jest.fn();

    server.on('download_piece', downloadPiece);
    client.on('piece_received', pieceReceived);

    client.emit('download_piece', {
      infoHash: 'ddc691962b2dfdde74958ad4dd8bde859e476d33',
      pieceIndex: 420,
    });

    await waitExpectations(() => {
      expect(downloadPiece).toHaveBeenCalledWith({
        infoHash: 'ddc691962b2dfdde74958ad4dd8bde859e476d33',
        pieceIndex: 420,
      });

      expect(client.isReady()).toBeFalsy();
    });

    server.emit('piece_received', {
      infoHash: 'ddc691962b2dfdde74958ad4dd8bde859e476d33',
      index: 420,
      content: Buffer.alloc(2),
    });

    await waitExpectations(() => {
      expect(pieceReceived).toHaveBeenCalledWith({
        infoHash: 'ddc691962b2dfdde74958ad4dd8bde859e476d33',
        index: 420,
        content: Buffer.alloc(2),
      });
    });
  });
});
