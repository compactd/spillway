export default interface IWireInterface {
  parseToken(token: string): { hi: string; hn: string };
  writeFilePiece(path: string, start: number, content: Buffer): Promise<void>;
  getFilesForTorrent(
    infoHash: string,
  ): { offset: number; length: number; path: string }[];
}
