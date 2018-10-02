import { ITorrentStorage } from './definitions';
import { promisify } from 'util';
import { open, read, write, close, exists } from 'fs';
import { join } from 'path';
import { log } from './logger';

const pread = promisify(read);
const pwrite = promisify(write);
const popen = promisify(open);
const pclose = promisify(close);
const pexists = promisify(exists);

export default class FSTorrentStorage implements ITorrentStorage {
  private fdTable: {
    [index: number]: number;
  } = {};
  constructor(
    private opts: {
      pieceLength: number;
      length: number;
      path: string;
      files: { path: string; offset: number; length: number }[];
    },
  ) {}
  downloaded(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  isDone(): boolean {
    throw new Error('Method not implemented.');
  }
  async put(index: number, content: Buffer): Promise<void> {
    const { pieceLength } = this.opts;
    const pieceStart = pieceLength * index;
    const pieceEnd = pieceLength * (index + 1);

    log('put(%d): offset %d-%d', index, pieceStart, pieceEnd);

    await Promise.all(
      this.opts.files
        .filter(({ length, offset }) => {
          const eof = offset + length;

          return (
            (offset >= pieceStart && offset < pieceEnd) ||
            (eof >= pieceStart && eof < pieceEnd) ||
            (offset <= pieceStart && eof > pieceEnd)
          );
        })
        .map(async ({ path, offset, length }) => {
          const fd = await this.open(
            this.opts.files.findIndex(f => f.path === path),
          );
          const fileEnd = offset + length;
          const bufferOffset = Math.max(offset - pieceStart, 0);
          const filePosition = Math.max(pieceStart - offset, 0);
          const endPosition = Math.max(fileEnd - pieceEnd, 0);
          const bytesToWrite = fileEnd - offset - filePosition - endPosition;
          // log('put(%d):');
          log(
            'put(%d): writing %d bytes from %o[%d] to %d[%d] for file %o; fd=%o',
            index,
            bytesToWrite,
            content,
            bufferOffset,
            fd,
            filePosition,
            { offset, length, path },
            this.fdTable,
          );

          await pwrite(fd, content, bufferOffset, bytesToWrite, filePosition);
        }),
    );
  }
  async get(index: number): Promise<Buffer> {
    const { pieceLength } = this.opts;
    const pieceStart = pieceLength * index;
    const pieceEnd = pieceLength * (index + 1);

    const chunks = await Promise.all(
      this.opts.files
        .filter(({ length, offset }) => {
          const eof = offset + length;

          return (
            (offset >= pieceStart && offset < pieceEnd) ||
            (eof >= pieceStart && eof < pieceEnd) ||
            (offset <= pieceStart && eof > pieceEnd)
          );
        })
        .map(async ({ length, offset, path }) => {
          const fd = await this.open(
            this.opts.files.findIndex(f => f.path === path),
          );

          const fileEnd = offset + length;
          const bufferOffset = 0;
          const filePosition = Math.max(pieceStart - offset, 0);
          const endPosition = Math.max(fileEnd - pieceEnd, 0);
          const bytesToRead = fileEnd - offset - filePosition - endPosition;
          const content = Buffer.allocUnsafe(bytesToRead);

          log(
            'get(%d): reading %d bytes from %d[%d] for file %o; fd=%o',
            index,
            bytesToRead,
            fd,
            filePosition,
            { offset, length, path },
            this.fdTable,
          );
          await pread(fd, content, bufferOffset, bytesToRead, filePosition);

          log('get(%d): read %o', index, content);

          return content;
        }),
    );

    return Buffer.concat(chunks);
  }

  private async open(index: number) {
    log(
      'open(%d): open file %s (curr: %d)',
      index,
      join(this.opts.path, this.opts.files[index].path),
      this.fdTable[index] || 0,
    );
    return this.fdTable[index]
      ? this.fdTable[index]
      : (this.fdTable[index] = await this.openOrCreate(
          join(this.opts.path, this.opts.files[index].path),
        ));
  }

  private async openOrCreate(file: string) {
    if (await pexists(file)) {
      return await popen(file, 'r+');
    }
    return await popen(file, 'w+');
  }

  async close() {
    await Promise.all(
      Object.keys(this.fdTable).map(index => {
        return pclose(this.fdTable[index as any]).then(() => {
          delete this.fdTable[index as any];
        });
      }),
    );
  }
}
