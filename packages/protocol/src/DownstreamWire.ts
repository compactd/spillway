import { SocketState, socketStateMachine, IDownstream } from './definitions';
import {
  IPiece,
  EventKey,
  AppEvent,
  EventIn,
  TorrentEvent,
} from '@spillway/torrent-client';
import { log, warn } from './logger';

// const debug = require('debug')('wire');

export default class DownstreamWire implements IDownstream {
  private state: SocketState = SocketState.Ready;
  constructor(private socket: SocketIO.Socket) {
    socket.on('disconnect', () => {
      log('%s: socket disconnected', socket.id);
      this.setState(SocketState.Closed);
    });
    socket.on('error', err => {
      warn('%s: socket error: %O', socket.id, err);
      this.setState(SocketState.Errored);
    });
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

  async addTorrent(content: Buffer) {
    log('adding torrent %o', content);
    return this.emitAndCallback('add_torrent', content);
  }

  async getState() {
    return this.emitAndCallback('get_state');
  }

  async getPiece(infoHash: string, index: number): Promise<IPiece> {
    return this.emitAndCallback('get_piece', { infoHash, index });
  }

  handleAppEvent<K extends EventKey<AppEvent>>(
    name: K,
    callback: ((...args: EventIn<AppEvent, K>) => void),
  ) {
    log('subscribing to %s', name);
    this.socket.on(`app_event_${name}`, callback as any);
    this.socket.emit('sub_to_app_event', { name });
  }

  handleTorrentEvent<K extends EventKey<TorrentEvent>>(
    infoHash: string,
    name: K,
    callback: ((...args: EventIn<TorrentEvent, K>) => void),
  ): void {
    log('subscribing to %s#%s', infoHash, name);
    this.socket.on(`${infoHash.slice(0, 7)}_event_${name}`, callback as any);
    this.socket.emit('sub_to_torrent_event', { infoHash, name });
  }

  private emitAndCallback(fn: string, payload?: any): Promise<any> {
    this.setState(SocketState.TransmittingData);

    const id = Math.random()
      .toString(16)
      .slice(2);
    return new Promise(resolve => {
      this.socket.once('fcallback_' + id, ({ data }: any) => {
        this.setState(SocketState.Ready);
        resolve(data);
      });
      this.socket.emit('fcall_' + fn, {
        cb: id,
        payload,
      });
    });
  }
}
