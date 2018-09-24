import {
  TorrentProperties,
  TorrentState,
  IPiece,
} from '@spillway/torrent-client';

/**
 * Describes a torrent indendantly from its state
 */

export interface IUpstream {
  syncTorrent: (id: string) => Promise<void>;
}

export interface IDownstream {
  addTorrent: (content: Buffer) => Promise<void>;
  getState: () => Promise<(TorrentProperties & TorrentState)[]>;
  getPiece: (infoHash: string, index: number) => Promise<IPiece>;
}

export enum SocketState {
  Ready,
  TransmittingData,
  Errored,
  Closed,
}

export function socketStateMachine(from: SocketState, to: SocketState) {
  switch (to) {
    case SocketState.Ready:
      if (from === SocketState.TransmittingData) {
        return SocketState.Ready;
      }
      throw new Error(`State Machine: Cannot pass from ${from} to ${to}`);
    case SocketState.TransmittingData:
      if (from === SocketState.Ready) {
        return SocketState.TransmittingData;
      }
      throw new Error(`State Machine: Cannot pass from ${from} to ${to}`);
    case SocketState.Errored:
      if (from === SocketState.Closed) {
        throw new Error(`State Machine: Cannot pass from ${from} to ${to}`);
      }
      return to;
    case SocketState.Closed:
      return to;
  }
  throw new Error(`State Machine: Cannot pass from ${from} to ${to}`);
}
