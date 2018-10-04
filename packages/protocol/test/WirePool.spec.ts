import { waitExpectations } from './test-utils';
import WirePool from '../src/WirePool';

describe('constructor', () => {
  let pool: WirePool;
  const getPiece = jest.fn().mockResolvedValue({});
  const close = jest.fn();
  const handleAppEvent = jest.fn();
  const addTorrent = jest.fn();
  const getPiecesState = jest.fn();
  const getState = jest.fn();
  const handleTorrentEvent = jest.fn();

  const wireFactory = jest.fn().mockReturnValue({
    close,
    getPiece,
    handleAppEvent,
    addTorrent,
    getPiecesState,
    getState,
    handleTorrentEvent,
  });

  beforeEach(() => {
    wireFactory.mockClear();
    getPiece.mockClear();
    handleAppEvent.mockClear();
    addTorrent.mockClear();
    getPiecesState.mockClear();
    getState.mockClear();
    handleTorrentEvent.mockClear();

    pool = new WirePool(
      {
        maxConnections: 3,
        target: 'foobar',
      },
      wireFactory,
    );
  });

  test('calls wirefactory twice', () => {
    expect(wireFactory).toHaveBeenCalledTimes(4);
  });

  test('destroy', async () => {
    await pool.getPiece('foobar', 0);

    await pool.destroy();

    expect(close).toHaveBeenCalledTimes(4);

    pool.destroy();
  });

  test('handleAppEvents', async () => {
    const cb = jest.fn();

    pool.on('torrent_added', cb);
    pool.handleAppEvents();

    expect(handleAppEvent).toHaveBeenCalled();

    const [[evt, fn]] = handleAppEvent.mock.calls;

    expect(evt).toBe('torrent_added');

    fn('foobar');

    await waitExpectations(() => {
      expect(cb).toHaveBeenCalledWith('foobar');
    });
  });

  test('addTorrent', async () => {
    await pool.addTorrent(Buffer.from('foo'));

    expect(addTorrent).toHaveBeenCalledWith(Buffer.from('foo'));
  });

  test('getAvailablePieces', async () => {
    getPiecesState.mockResolvedValueOnce([420]);

    expect(await pool.getAvailablePieces('foo')).toEqual([420]);

    expect(getPiecesState).toHaveBeenCalledWith('foo');
  });

  test('getPiece', async () => {
    getPiece.mockResolvedValueOnce({
      index: 420,
      content: Buffer.from('44203'),
    });

    expect(await pool.getPiece('foo', 420)).toEqual({
      index: 420,
      content: Buffer.from('44203'),
    });

    expect(getPiece).toHaveBeenCalledWith('foo', 420);
  });

  test('retrieveTorrent without resuming', async () => {
    const hasPiece = jest.fn().mockResolvedValue(false);
    const callback = jest.fn();

    getState.mockResolvedValue([]);
    getPiecesState.mockResolvedValue([420, 0, 1]);
    getPiece.mockImplementation((_, index: number) => ({
      index,
      offset: 0,
      content: Buffer.from('foo'),
    }));

    pool.retrieveTorrent('foobar', hasPiece, callback);

    await waitExpectations(() => {
      expect(handleAppEvent).toHaveBeenCalled();
    });

    const [[evt, fn]] = handleAppEvent.mock.calls;

    await fn('foobar');

    await waitExpectations(() => {
      expect(callback).toHaveBeenCalledTimes(3);
    });

    expect(getPiece).toHaveBeenCalledTimes(3);

    expect(callback.mock.calls).toMatchObject([
      [420, 0, Buffer.from('foo')],
      [0, 0, Buffer.from('foo')],
      [1, 0, Buffer.from('foo')],
    ]);
  });
});
