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

export interface SpillwayClientEvents {
  torrent_added: (props: TorrentProperties) => void;
  torrent_state_update: (
    evt: { infoHash: string; state: TorrentState },
  ) => void;
  piece_available: (data: { infoHash: string; pieces: number[] }) => void;
}
