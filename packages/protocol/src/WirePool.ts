import DownstreamWire from './DownstreamWire';
import { EventEmitter } from 'ee-ts';
import { AppEvent } from '@spillway/torrent-client';
import { log } from './logger';

export default class WirePool extends EventEmitter<AppEvent> {
  private wires: DownstreamWire[];
  private primaryWire: DownstreamWire;
  private secondaryWire: DownstreamWire;

  constructor(
    private opts: {
      maxConnections: number;
      target: string;
    },
    private WireFactory: (target: string) => DownstreamWire,
  ) {
    super();
    this.wires = new Array(opts.maxConnections);

    this.secondaryWire = WireFactory(this.opts.target);

    this.primaryWire = WireFactory(this.opts.target);
  }

  handleAppEvents() {
    this.primaryWire.handleAppEvent('torrent_added', torrent => {
      return this.emit('torrent_added', torrent);
    });
  }

  getState() {
    return this.primaryWire.getState();
  }

  addTorrent(buffer: Buffer) {
    this.primaryWire.addTorrent(buffer);
  }

  /**
   * Retrieves a torrent data
   * @param infoHash the torent hash to  retrieve
   * @param cb called every time a piece is received
   */
  retrieveTorrent(
    infoHash: string,
    cb: (index: number, offset: number, piece: Buffer) => void,
  ) {
    this.secondaryWire.handleTorrentEvent(
      infoHash,
      'piece_available',
      async ({ pieceIndex }) => {
        const {
          content,
          index,
          offset,
        } = await this.getNextAvailableSocket().getPiece(infoHash, pieceIndex);

        cb(index, offset, content);
      },
    );
  }

  getNextAvailableSocket(cursor = 0): DownstreamWire {
    const wire = this.wires[cursor];

    if (!wire) {
      log('creating new wire at %d', cursor);
      this.wires[cursor] = this.WireFactory(this.opts.target);

      return this.wires[cursor];
    }

    if (wire.isReady()) {
      return wire;
    }

    return this.getNextAvailableSocket(cursor + 1);
  }
}
