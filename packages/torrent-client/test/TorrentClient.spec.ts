import TorrentClient from '../src/TorrentClient';
import { readFileSync } from 'fs';
import * as rmfr from 'rmfr';

const waitForExpect = require('wait-for-expect') as (
  fn: () => void,
) => Promise<void>;

describe('TorrentClient', () => {
  const client = new TorrentClient();

  beforeAll(async () => {
    rmfr('/tmp/webtorrent');
  });

  afterAll(() => {
    client.destroy();
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

  const callback = jest.fn();

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
});
