import { Operation } from 'fast-json-patch';

/**
 * Describes a torrent indendantly from its state
 */
export interface TorrentProperties {
  infoHash: string;
  name: string;
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

export interface SpillwayClientEvents {
  torrent_added: (props: TorrentProperties) => void;
  torrent_state_update: (
    evt: { infoHash: string; state: TorrentState },
  ) => void;
  piece_available: (data: { infoHash: string; pieces: number[] }) => void;
}

export type Filter<T, Cond, U extends keyof T = keyof T> = {
  [K in U]: T[K] extends Cond ? K : never
}[U];
export type EventKey<T> = Filter<T, (...args: any[]) => any> & string;
export type In<T> = T extends (...args: infer U) => any ? U : [];
export type Out<T> = T extends (...args: any[]) => infer U ? U : void;
export type Id<T> = T;
export type EventIn<T, K extends EventKey<T>> = Id<In<T[K]>>;

export type Promised<T> = {
  [P in keyof T]: (...args: In<T[P]>) => Promise<Out<T[P]>>
};

export interface TorrentProperties {
  infoHash: string;
  name: string;
  size: number;
}

export enum TorrentStatus {
  Starting,
  Downloading,
  Seeding,
  Inactive,
  Paused,
  Destroyed,
}

export interface IPiece {
  content: Buffer;
  index: number;
  offset: number;
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

export interface AppEvent {
  torrent_added: (props: string) => void;
  state_diff: (diff: Operation[]) => void;
}

export interface TorrentEvent {
  state_updated: (stateDiff: Operation[]) => void;
  piece_available: (
    data: {
      pieceIndex: number;
    },
  ) => void;
}

export interface IClient {
  addTorrent: (content: Buffer) => void;
  getState: () => (TorrentState & TorrentProperties)[];
  getPiece: (id: string, index: number) => Promise<IPiece>;
  onAppEvent: <K extends EventKey<AppEvent>>(
    name: K,
    callback: ((...args: EventIn<AppEvent, K>) => void),
  ) => void;
  onTorrentEvent: <K extends EventKey<TorrentEvent>>(
    infoHash: string,
    name: K,
    callback: ((...args: EventIn<TorrentEvent, K>) => void),
  ) => void;
  getAvailablePieces: (id: string) => Promise<number[]>;
}
