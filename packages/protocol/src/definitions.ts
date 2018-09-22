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

export interface SpillwayProtocolEvents {
  torrent_added: (props: TorrentProperties) => void;
  add_torrent: (torrent: Buffer) => void;
  resume_torrent: (infoHash: string) => void;
  pause_torrent: (infoHash: string) => void;
  remove_torrent: (infoHash: string) => void;
  subscribe_to: (data: { infoHash: string; piecesState: boolean }) => void;
  torrent_state_update: (
    evt: { infoHash: string; state: TorrentState },
  ) => void;
  piece_available: (data: { infoHash: string; pieces: number[] }) => void;
  download_piece: (data: { infoHash: string; pieceIndex: number }) => void;
  piece_received: (
    piece: {
      infoHash: string;
      index: number;
      content: Buffer;
    },
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
