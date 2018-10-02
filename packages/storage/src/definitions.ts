export interface ITorrentStorage {
  downloaded(): Promise<void>;
  isDone(): boolean;
  put(index: number, content: Buffer): Promise<void>;
  get(index: number): Promise<Buffer>;
}
