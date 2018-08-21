export enum TorrentEvent {
  TorrentUpdate = 0x02,
  TorrentPiece = 0x04,
}

export enum TorrentStatus {
  Pending = 0x01,
  Downloading = 0x02,
  Seeding = 0x04,
  Inactive = 0x08,
  Paused = 0x10,
  Destroyed = 0x20,
}

export default interface IWireInterface {
  parseToken(token: string): { hi: string; hn: string };
  writeFilePiece(path: string, start: number, content: Buffer): Promise<void>;
  getFilesForTorrent(
    infoHash: string,
  ): { offset: number; length: number; path: string }[];

  /**
   * Add to the client a torrrent and start it
   * @param torrent the torrent buffer
   */
  startTorrent(
    torrent: Buffer,
  ): {
    infoHash: string;
  };

  pauseTorrent(infoHash: string): {};
  destroyTorrent(infoHash: string): {};
  resumeTorrent(infoHash: string): {};

  /**
   * Subscribes to torrent-relative events
   * @param infoHash the torrent hash
   * @param event the event name
   * @param cb the event callback
   */
  subscribeTE(
    infoHash: string,
    event: TorrentEvent.TorrentUpdate,
    cb: (
      stats: {
        status: TorrentStatus;
        peers: number;
        downloaded: number;
        uploaded: number;
        downloadSpeed: number;
        uploadSpeed: number;
      },
    ) => void,
  ): void;
  subscribeTE(
    infoHash: string,
    event: TorrentEvent.TorrentPiecesAvailable,
    cb: (data: { pieces: Uint32Array }) => void,
  ): void;
  subscribeTE(
    infoHash: string,
    event: TorrentEvent.TorrentPiece,
    cb: (data: { piece: Buffer }) => void,
  ): void;
}
