import {
  IClient,
  In,
  AppEvent,
  TorrentEvent,
  TorrentStatus,
  Promised,
  IPiece,
  TorrentProperties,
  TorrentState,
} from './definitions';
import * as WebTorrent from 'webtorrent';
import { EventEmitter } from 'events';
import { compare, Operation } from 'fast-json-patch';

const FSChunkStore = require('fs-chunk-store');

export default class TorrentClient implements Promised<IClient> {
  static DEFAULT_POLLING_INTERVAL = 200;
  private eventEmitter: EventEmitter;
  private oldState: { [hash: string]: TorrentState & TorrentProperties } = {};
  constructor(private client = new WebTorrent()) {
    this.eventEmitter = new EventEmitter();
    this.listenToStateDiff();
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
          this.eventEmitter.emit('torrent_added', infoHash);
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
        size: (torrent as any).length,
      };
    });
  }

  async getIndexedState(): Promise<{
    [hash: string]: TorrentState & TorrentProperties;
  }> {
    return (await this.getState()).reduce((acc, torrent) => {
      return { ...acc, [torrent.infoHash]: torrent };
    }, {});
  }

  async listenToStateDiff() {
    this.oldState = await this.getIndexedState();

    setInterval(
      this.compareAndEmitState.bind(this),
      TorrentClient.DEFAULT_POLLING_INTERVAL,
    );

    // this.eventEmitter.on('activity', () =>)
  }

  async compareAndEmitState() {
    if (this.eventEmitter.listeners('state_diff').length > 0) {
      const current = await this.getIndexedState();
      const diff = compare(this.oldState, current);

      if (diff.length > 0) {
        this.eventEmitter.emit('state_diff', diff);

        this.oldState = current;
      }
    }
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
  async onAppEvent<K extends keyof AppEvent>(
    name: K,
    callback: (...args: In<AppEvent[K]>) => void,
  ): Promise<void> {
    switch (name) {
      case 'torrent_added':
        this.eventEmitter.on('torrent_added', callback as any);

        return;
      case 'state_diff':
        this.eventEmitter.on('state_diff', callback as any);

        return;
    }
  }

  async onTorrentEvent<K extends 'state_updated' | 'piece_available'>(
    infoHash: string,
    name: K,
    callback: (...args: In<TorrentEvent[K]>) => void,
  ): Promise<void> {
    if (name === 'piece_available') {
      this.eventEmitter.on('piece_' + infoHash, ({ index }) => {
        callback({ pieceIndex: index });
      });
    } else if (name === 'state_updated') {
      this.eventEmitter.on('state_diff', (diff: Operation[]) => {
        const torrentDiffs = diff.filter(op =>
          op.path.startsWith('/' + infoHash),
        );

        if (torrentDiffs.length > 0) {
          callback(torrentDiffs);
        }
      });
    }
  }
}
