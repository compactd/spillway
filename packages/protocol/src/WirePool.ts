import DownstreamWire from './DownstreamWire';
import * as io from 'socket.io-client';
import { IClient, AppEvent } from './definitions';
import { EventEmitter } from 'ee-ts';

export default class WirePool extends EventEmitter<AppEvent> {
  private wires: DownstreamWire[];
  private primaryWire: DownstreamWire;
  private secondaryWire: DownstreamWire;

  constructor(
    private opts: {
      maxConnections: number;
      target: string;
      client: IClient;
    },
    private WireFactory = (target: string) => new DownstreamWire(io(target)),
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
      this.wires[cursor] = this.WireFactory(this.opts.target);

      return this.wires[cursor];
    }

    if (wire.isReady()) {
      return wire;
    }

    return this.getNextAvailableSocket(cursor + 1);
  }
}
