import {
  IClient,
  In,
  AppEvent,
  TorrentEvent,
  TorrentStatus,
  Promised,
  IPiece,
} from './definitions';
import * as WebTorrent from 'webtorrent';
import { EventEmitter } from 'events';

const FSChunkStore = require('fs-chunk-store');

export default class TorrentClient implements Promised<IClient> {
  private eventEmitter: EventEmitter;
  constructor(private client = new WebTorrent()) {
    this.eventEmitter = new EventEmitter();
  }

  addTorrent(content: Buffer): Promise<void> {
    const self = this;
    let infoHash: string = 'unknown';
    return new Promise((resolve, _) => {
      this.client.add(
        content,
        {
          store: class CustomFSChunkStore extends FSChunkStore {
            put(index: number, buffer: Buffer, cb: () => void) {
              super.put(index, buffer, () => {
                cb();
                self.eventEmitter.emit('piece_' + infoHash, { index });
              });
            }
          } as any,
        },
        torrent => {
          infoHash = torrent.infoHash;
          resolve();
        },
      );
    });
  }

  destroy() {
    this.client.destroy();
  }
  async getState() {
    return this.client.torrents.map(torrent => {
      return {
        infoHash: torrent.infoHash,
        name: torrent.name,
        status: TorrentStatus.Downloading,
        progress: torrent.progress,
        downloaded: torrent.downloaded,
        uploaded: torrent.uploaded,
        upSpeed: torrent.uploadSpeed,
        downSpeed: torrent.downloadSpeed,
        eta: torrent.timeRemaining,
      };
    });
  }

  getPiece(id: string, index: number): Promise<IPiece> {
    return new Promise((resolve, reject) => {
      const torrent = this.client.get(id);

      if (!torrent) reject(new Error('Cannot find torrent id ' + id));

      (torrent as any).store.get(index, (err: Error | null, res: Buffer) => {
        if (err) return reject(err);
        resolve({
          index,
          offset: 0,
          content: res,
        });
      });
    });
  }
  async onAppEvent<K extends 'torrent_added'>(
    name: K,
    callback: (...args: In<AppEvent[K]>) => void,
  ): Promise<void> {}

  async onTorrentEvent<K extends 'state_updated' | 'piece_available'>(
    infoHash: string,
    name: K,
    callback: (...args: In<TorrentEvent[K]>) => void,
  ): Promise<void> {
    if (name === 'piece_available') {
      this.eventEmitter.on('piece_' + infoHash, ({ index }) => {
        callback({ pieceIndex: index });
      });
    }
  }
}
