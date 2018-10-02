export interface IStorage {
  put(index: number, content: Buffer): Promise<void>;
  get(index: number): Promise<Buffer>;
}

// type CArgs<T> = T extends { new (...args: infer R): any } ? R : never;

export default function withIntegrity<
  T extends { new (...args: any[]): IStorage }
>(Base: T, checkIntegrity: (hash: string, content: Buffer) => Promise<void>) {
  return class WrappedBase extends Base {
    private pieces: string[] = [];
    setPieces(pieces: string[]) {
      this.pieces = pieces;
    }
    async put(index: number, content: Buffer) {
      await checkIntegrity(this.pieces[index], content);
      super.put(index, content);
    }
    async get(index: number) {
      const content = await super.get(index);
      await checkIntegrity(this.pieces[index], content);
      return content;
    }
  };
}
