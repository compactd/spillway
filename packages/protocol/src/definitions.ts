/**
 * Describes a torrent indendantly from its state
 */
export interface TorrentProperties {
  infoHash: string;
  name: string;
}

export enum TorrentStatus {
  Starting,
  Downloading,
  Seeding,
  Inactive,
  Paused,
  Destroyed,
}

export interface TorrentState {
  status: TorrentStatus;
  progress: number;
  eta: number;
  downloaded: number;
  uploaded: number;
  upSpeed: number;
  downSpeed: number;
}

export type Filter<T, Cond, U extends keyof T = keyof T> = {
  [K in U]: T[K] extends Cond ? K : never
}[U];
export type EventKey<T> = Filter<T, (...args: any[]) => any> & string;
export type In<T> = T extends (...args: infer U) => any ? U : [];
export type Id<T> = T;
export type EventIn<T, K extends EventKey<T>> = Id<In<T[K]>>;

export interface AppEvent {
  torrent_added: (props: TorrentProperties) => void;
}

export interface TorrentEvent {
  state_updated: (state: TorrentState) => void;
  piece_available: (
    data: {
      pieceIndex: number;
    },
  ) => void;
}

export interface IUpstream {
  syncTorrent: (id: string) => Promise<void>;
}

export interface IPiece {
  content: Buffer;
  index: number;
  offset: number;
}

export interface IDownstream {
  addTorrent: (content: Buffer) => Promise<void>;
  getState: () => Promise<(TorrentProperties & TorrentState)[]>;
  getPiece: (infoHash: string, index: number) => Promise<IPiece>;
}

export interface IClient {
  addTorrent: (content: Buffer) => void;
  getState: () => (TorrentState & TorrentProperties)[];
  getPiece: (id: string, index: number) => IPiece;
  onAppEvent: <K extends EventKey<AppEvent>>(
    name: K,
    callback: ((data: EventIn<AppEvent, K>) => void),
  ) => void;
  onTorrentEvent: <K extends EventKey<TorrentEvent>>(
    infoHash: string,
    name: K,
    callback: ((data: EventIn<TorrentEvent, K>) => void),
  ) => void;
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
