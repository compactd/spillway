import DownstreamWire from './DownstreamWire';
import { EventEmitter } from 'ee-ts';
import { AppEvent } from '@spillway/torrent-client';
import { Pool, createPool } from 'generic-pool';
import { warn } from './logger';

export default class WirePool extends EventEmitter<AppEvent> {
  private pool: Pool<DownstreamWire>;
  private primaryWire: DownstreamWire;
  private secondaryWire: DownstreamWire;

  constructor(
    private opts: {
      maxConnections: number;
      target: string;
    },
    WireFactory: (target: string) => DownstreamWire,
  ) {
    super();

    this.pool = createPool(
      {
        create: () => Promise.resolve(WireFactory(this.opts.target)),
        destroy: wire => Promise.resolve(wire.close()),
      },
      {
        max: 100,
        min: 2,
      },
    );

    this.primaryWire = WireFactory(this.opts.target);

    this.secondaryWire = WireFactory(this.opts.target);
  }

  handleAppEvents() {
    this.primaryWire.handleAppEvent('torrent_added', torrent => {
      return this.emit('torrent_added', torrent);
    });
  }

  async destroy() {
    await this.pool.drain();
    await this.pool.clear();

    this.primaryWire.close();
    this.secondaryWire.close();
  }

  addTorrent(buffer: Buffer) {
    this.primaryWire.addTorrent(buffer);
  }

  getAvailablePieces(id: string) {
    return this.secondaryWire.getPiecesState(id);
  }

  async getPiece(infoHash: string, index: number) {
    const wire = await this.pool.acquire();
    const piece = await wire.getPiece(infoHash, index);

    try {
      await this.pool.release(wire);
    } catch (e) {
      warn('error releasing wire: %o', e);
    }

    return piece;
  }

  getState() {
    return this.primaryWire.getState();
  }

  /**
   * Retrieves a torrent data
   * @param infoHash the torent hash to retrieve
   * @param cb called every time a piece is received
   */
  retrieveTorrent(
    infoHash: string,
    hasPiece: (index: number) => Promise<boolean>,
    cb: (index: number, offset: number, piece: Buffer) => void,
  ) {
    const onPiece = async ({ pieceIndex }: { pieceIndex: number }) => {
      if (!(await hasPiece(pieceIndex))) {
        const { content, index, offset } = await this.getPiece(
          infoHash,
          pieceIndex,
        );

        cb(index, offset, content);
      }
    };

    this.secondaryWire.handleTorrentEvent(infoHash, 'piece_available', onPiece);

    this.getState().then(async torrents => {
      if (torrents.find(t => t.infoHash === infoHash)) {
        const wire = await this.pool.acquire();
        wire.getPiecesState(infoHash).then(pieces => {
          pieces.map(pieceIndex => ({ pieceIndex })).forEach(onPiece);
          this.pool.release(wire);
        });
      } else {
        this.secondaryWire.handleAppEvent('torrent_added', async props => {
          if (props === infoHash) {
            const wire = await this.pool.acquire();
            wire.getPiecesState(infoHash).then(pieces => {
              pieces.map(pieceIndex => ({ pieceIndex })).forEach(onPiece);
              this.pool.release(wire);
            });
          }
        });
      }
    });
  }
}
