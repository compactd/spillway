import { log, warn } from './logger';
import { EventEmitter } from 'ee-ts';

export interface IStorage {
  put(index: number, content: Buffer): Promise<void>;
  get(index: number): Promise<Buffer>;
}

// type CArgs<T> = T extends { new (...args: infer R): any } ? R : never;

export default function withIntegrity<
  T extends { new (...args: any[]): IStorage }
>(Base: T, checkIntegrity: (hash: string, content: Buffer) => Promise<void>) {
  return class WrappedBase extends Base {
    pieces!: string[];
    validPieces = new Set();
    downloadCallbacks: (() => void)[] = [];
    bus = new EventEmitter<{
      piece_verified: (piece: number) => void;
    }>();

    setPieces(pieces: string[]) {
      log('loading %d pieces', pieces.length);

      this.pieces = pieces;
      this.validPieces.clear();

      Promise.all(
        pieces.map(async (_, index) => {
          try {
            await this.get(index);
            this.firePieceVerified(index);
            this.validPieces.add(index);
          } catch {}
        }),
      ).then(() => {
        log('piece %d is valid', this.validPieces.size);
        this.fireIfDone();
      });
    }

    firePieceVerified(index: number) {
      if (!this.validPieces.has(index)) {
        this.bus.emit('piece_verified', index);
      }
    }

    async put(index: number, content: Buffer) {
      await checkIntegrity(this.pieces[index], content);

      await super.put(index, content);

      this.firePieceVerified(index);

      this.validPieces.add(index);
      this.fireIfDone();
    }

    async get(index: number) {
      const content = await super.get(index);

      await checkIntegrity(this.pieces[index], content);

      this.firePieceVerified(index);

      this.validPieces.add(index);
      this.fireIfDone();

      return content;
    }

    async has(index: number) {
      if (this.validPieces.has(index)) return true;

      const content = await super.get(index);

      try {
        await checkIntegrity(this.pieces[index], content);
      } catch {
        return false;
      }

      this.firePieceVerified(index);

      this.validPieces.add(index);
      this.fireIfDone();

      return true;
    }

    waitUntilDownloaded() {
      return new Promise(resolve => {
        this.downloadCallbacks.push(resolve);
      });
    }

    fireIfDone() {
      if (this.validPieces.size === this.pieces.length) {
        this.downloadCallbacks.forEach(cb => cb());
        this.downloadCallbacks = [];
      }
    }
  };
}
