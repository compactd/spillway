import DownstreamWire from './DownstreamWire';
import * as io from 'socket.io-client';
import { SpillwayProtocolEvents } from './definitions';
import { EventEmitter as EE } from 'ee-ts';

export default class WirePool extends EE<SpillwayProtocolEvents> {
  private wires: DownstreamWire[];
  private primaryWire: DownstreamWire;
  private secondaryWire: DownstreamWire;

  constructor(
    private opts: {
      maxConnections: number;
      target: string;
    },
  ) {
    super();
    this.wires = new Array(opts.maxConnections);

    this.secondaryWire = new DownstreamWire(io(this.opts.target));

    this.primaryWire = new DownstreamWire(io(this.opts.target));

    this.primaryWire.handleLifecycle();
    this.primaryWire.on('torrent_added', props => {
      this.secondaryWire.emit('subscribe_to', {
        infoHash: props.infoHash,
        piecesState: false,
      });
    });
  }

  getNextAvailableSocket(cursor = 0): DownstreamWire {
    const wire = this.wires[cursor];

    if (!wire) {
      this.wires[cursor] = new DownstreamWire(io(this.opts.target));
    }

    if (wire.isReady()) {
      return wire;
    }

    return this.getNextAvailableSocket(cursor + 1);
  }
}
