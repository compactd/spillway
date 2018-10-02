export interface ITorrentStorage {
  downloaded(): Promise<void>;
  isDone(): Promise<boolean>;
  verifyTorrent(): Promise<boolean>;
  put(index: number, content: Buffer): Promise<void>;
  get(index: number): Promise<Buffer>;
}
