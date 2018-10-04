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
