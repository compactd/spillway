export enum TorrentEvent {
  TorrentUpdate = 0x02,
  TorrentPiecesAvailable = 0x04,
  TorrentPiece = 0x08,
}

export enum TorrentStatus {
  Pending = 0x1,
  Downloading = 0x2,
  Seeding = 0x4,
  Inactive = 0x8,
  Paused = 0x10,
  Destroyed = 0x20,
}

export default interface IWireInterface {
  parseToken(token: string): { hi: string; hn: string };
  writeFilePiece(path: string, start: number, content: Buffer): Promise<void>;
  getFilesForTorrent(
    infoHash: string,
  ): { offset: number; length: number; path: string }[];
  startTorrent(
    torrent: Buffer,
  ): {
    infoHash: string;
  };
  subscribeClient(
    infoHash: string,
    event: TorrentEvent.TorrentUpdate,
    cb: (
      {
        status: TorrentStatus,
        peers: number,
        downloaded: number,
        uploaded: number,
        downloadSpeed: number,
        uploadSpeed: number,
      },
    ) => void,
  );
  subscribeClient(
    infoHash: string,
    event: TorrentEvent.TorrentPiecesAvailable,
    cb: ({ pieces: UInt32Array }) => void,
  );
  subscribeClient(
    infoHash: string,
    event: TorrentEvent.TorrentPiecesAvailable,
    cb: ({ pieces: UInt32Array }) => void,
  );
  subscribeClient(
    infoHash: string,
    event: TorrentEvent.TorrentPiece,
    cb: ({ piece: Buffer }) => void,
  );
}
