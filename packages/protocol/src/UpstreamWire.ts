import { EventEmitter as EE } from 'ee-ts';
import {
  SpillwayProtocolEvents,
  SocketState,
  socketStateMachine,
} from './definitions';
import { TorrentPropsTransform, TorrentPieceTransform } from './transforms';

const debug = require('debug')('wire');

export default class UpstreamWire extends EE<SpillwayProtocolEvents> {
  private state: SocketState = SocketState.Ready;
  constructor(private socket: SocketIO.Socket) {
    super();
  }

  setState(state: SocketState) {
    this.state = socketStateMachine(this.state, state);
  }

  isReady() {
    return this.state === SocketState.Ready;
  }

  setupListeners() {
    this.socket.on('add_torrent', torrent => {
      this.emit('add_torrent', torrent);
    });
    this.socket.on('pause_torrent', torrent => {
      this.emit('pause_torrent', torrent);
    });
    this.socket.on('resume_torrent', torrent => {
      this.emit('resume_torrent', torrent);
    });
    this.socket.on('remove_torrent', torrent => {
      this.emit('remove_torrent', torrent);
    });
    this.socket.on('remove_torrent', torrent => {
      this.emit('remove_torrent', torrent);
    });
    this.on('torrent_added', props => {
      this.socket.emit('torrent_added', TorrentPropsTransform.decode(props));
    });
    this.socket.on('subscribe_to', ({ infoHash, piecesState }) => {
      this.on('torrent_state_update', data => {
        if (data.infoHash === infoHash) {
          this.socket.emit('torrent_state_update', data);
        }
      });
      if (piecesState) {
        this.on('piece_available', data => {
          if (data.infoHash === infoHash) {
            this.socket.emit('piece_available', data);
          }
        });
      }
    });
    this.socket.on('download_piece', piece => {
      this.setState(SocketState.TransmittingData);
      this.on('piece_received', pieceData => {
        const encoded = TorrentPieceTransform.encode(pieceData);

        this.socket.emit('piece_received', encoded);
      });
      this.emit('download_piece', piece);
    });
  }
}
