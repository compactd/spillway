import TorrentClient from '../src/TorrentClient';
import { readFileSync } from 'fs';
import * as rmfr from 'rmfr';

const waitForExpect = require('wait-for-expect') as (
  fn: () => void,
  timeout?: number,
) => Promise<void>;

describe('TorrentClient', () => {
  const client = new TorrentClient();
  const torrentAdded = jest.fn();
  const stateDiff = jest.fn();
  jest.setTimeout(15000);

  beforeAll(async () => {
    rmfr('/tmp/webtorrent');
  });

  afterAll(() => {
    client.destroy();
  });

  test('subscribe for app event', async () => {
    client.onAppEvent('torrent_added', torrentAdded);
    client.onAppEvent('state_diff', stateDiff);
  });

  test('add a torrent', async () => {
    await client.addTorrent(
      readFileSync(__dirname + '/../debian-9.5.0-amd64-netinst.iso.torrent'),
    );
  });

  test('get the state', async () => {
    await waitForExpect(async () => {
      const state = await client.getState();
      expect(state).toHaveLength(1);

      const [{ infoHash, name }] = state;
      expect(infoHash).toBe('3b1d85f8780ef8c4d8538f809a7a63fc5299318e');
      expect(name).toBe('debian-9.5.0-amd64-netinst.iso');
    });
  });

  test('called torrentAdded and stateDiff', async () => {
    await waitForExpect(() => {
      expect(torrentAdded).toHaveBeenCalledTimes(1);
      expect(stateDiff).toHaveBeenCalled();
    });
    expect(torrentAdded).toHaveBeenCalledWith(
      '3b1d85f8780ef8c4d8538f809a7a63fc5299318e',
    );
    expect(stateDiff.mock.calls[0]).toMatchObject([
      [
        {
          op: 'add',
          path: '/3b1d85f8780ef8c4d8538f809a7a63fc5299318e',
          value: expect.any(Object),
        },
      ],
    ]);
  });

  const callback = jest.fn();
  const torrentDiff = jest.fn();

  test('subscribe for torrent state diff', async () => {
    client.onTorrentEvent(
      '3b1d85f8780ef8c4d8538f809a7a63fc5299318e',
      'state_updated',
      torrentDiff,
    );
  });

  test('wait for a piece', async () => {
    client.onTorrentEvent(
      '3b1d85f8780ef8c4d8538f809a7a63fc5299318e',
      'piece_available',
      callback,
    );
    await waitForExpect(async () => {
      expect(callback).toHaveBeenCalled();
    });
  });

  test('receive that piece', async () => {
    const [[{ pieceIndex }]] = callback.mock.calls;
    const piece = await client.getPiece(
      '3b1d85f8780ef8c4d8538f809a7a63fc5299318e',
      pieceIndex,
    );
    expect(piece.index).toBe(pieceIndex);
    expect(piece.content.length).toBe(262144);
  });

  test('this piece is available', async () => {
    const [[{ pieceIndex }]] = callback.mock.calls;

    const pieces = await client.getAvailablePieces(
      '3b1d85f8780ef8c4d8538f809a7a63fc5299318e',
    );

    expect(pieces).toContain(pieceIndex);
  });

  test('client returns empty piece list with non existing torrent', async () => {
    expect(await client.getAvailablePieces('foobar')).toEqual([]);
  });

  test('torrentDiff was called', async () => {
    jest.setTimeout(10000);
    await waitForExpect(() => {
      expect(torrentDiff).toHaveBeenCalledTimes(2);
    }, 10000);
  });
});
