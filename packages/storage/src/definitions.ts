export interface ITorrentStorage {
  put(index: number, content: Buffer): Promise<void>;
  get(index: number): Promise<Buffer>;
}
