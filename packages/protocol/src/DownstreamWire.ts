import { EventEmitter as EE } from 'ee-ts';
import {
  SpillwayProtocolEvents,
  SocketState,
  socketStateMachine,
} from './definitions';
import { TorrentPropsTransform, TorrentPieceTransform } from './transforms';

const debug = require('debug')('wire');

export default class DownstreamWire extends EE<SpillwayProtocolEvents> {
  private state: SocketState = SocketState.Ready;
  constructor(private socket: SocketIO.Socket) {
    super();
  }

  close() {
    this.socket.disconnect();
  }

  setState(state: SocketState) {
    this.state = socketStateMachine(this.state, state);
  }

  isReady() {
    return this.state === SocketState.Ready;
  }

  setupListeners() {
    this.on('add_torrent', torrent => {
      this.socket.emit('add_torrent', torrent);
    });
    this.on('pause_torrent', torrent => {
      this.socket.emit('pause_torrent', torrent);
    });
    this.on('resume_torrent', torrent => {
      this.socket.emit('resume_torrent', torrent);
    });
    this.on('remove_torrent', torrent => {
      this.socket.emit('remove_torrent', torrent);
    });
    this.socket.on('torrent_added', props => {
      this.emit('torrent_added', TorrentPropsTransform.decode(props));
    });
    this.on('subscribe_to', evt => {
      this.socket.emit('subscribe_to', evt);
    });
    this.socket.on('torrent_state_update', evt => {
      this.emit('torrent_state_update', evt);
    });
    this.on('download_piece', piece => {
      this.setState(SocketState.TransmittingData);
      this.socket.on('piece_received', pieceData => {
        const decoded = TorrentPieceTransform.decode(pieceData);

        this.emit('piece_received', decoded);
      });
      this.socket.emit('download_piece', piece);
    });
  }
}
