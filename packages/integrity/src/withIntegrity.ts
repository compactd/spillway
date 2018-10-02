import { log, warn } from './logger';

export interface IStorage {
  put(index: number, content: Buffer): Promise<void>;
  get(index: number): Promise<Buffer>;
}

// type CArgs<T> = T extends { new (...args: infer R): any } ? R : never;

export default function withIntegrity<
  T extends { new (...args: any[]): IStorage }
>(Base: T, checkIntegrity: (hash: string, content: Buffer) => Promise<void>) {
  return class WrappedBase extends Base {
    private pieces!: string[];
    private validPieces = new Set();
    private downloadCallbacks: (() => void)[] = [];

    setPieces(pieces: string[]) {
      log('loading %d pieces', pieces.length);

      this.pieces = pieces;
      this.validPieces.clear();

      Promise.all(
        pieces.map(async (_, index) => {
          try {
            await this.get(index);
            this.validPieces.add(index);
          } catch {}
        }),
      ).then(() => {
        log('piece %d is valid', this.validPieces.size);
        this.fireIfDone();
      });
    }

    async put(index: number, content: Buffer) {
      await checkIntegrity(this.pieces[index], content);

      await super.put(index, content);

      this.validPieces.add(index);
      this.fireIfDone();
    }

    async get(index: number) {
      const content = await super.get(index);

      await checkIntegrity(this.pieces[index], content);

      this.validPieces.add(index);
      this.fireIfDone();

      return content;
    }

    waitUntilDownloaded() {
      return new Promise(resolve => {
        this.downloadCallbacks.push(resolve);
      });
    }

    private fireIfDone() {
      if (this.validPieces.size === this.pieces.length) {
        this.downloadCallbacks.forEach(cb => cb());
        this.downloadCallbacks = [];
      }
    }
  };
}
