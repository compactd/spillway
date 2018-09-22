import { TorrentProperties } from './definitions';
import { read } from 'fs';

export interface Transform<Type, Data = Type> {
  encode: (data: Type) => Data;
  decode: (data: Data) => Type;
}

const DefaultTransform = {
  encode: (data: any) => data,
  decode: (data: any) => data,
};

export const TorrentPropsTransform: Transform<
  TorrentProperties
> = DefaultTransform;

export const TorrentPieceTransform: Transform<
  {
    infoHash: string;
    index: number;
    content: Buffer;
  },
  Buffer
> = {
  encode: ({ infoHash, index, content }) => {
    const buffer = Buffer.allocUnsafe(20 + 4 + content.length);

    buffer.write(infoHash, 0, 20, 'hex');
    buffer.writeInt32BE(index, 20);

    content.copy(buffer, 24);

    return buffer;
  },
  decode: (buffer: Buffer) => {
    const infoHash = buffer.slice(0, 20).toString('hex');
    const index = buffer.readInt32BE(20);
    const content = buffer.slice(24);

    return { infoHash, index, content };
  },
};
