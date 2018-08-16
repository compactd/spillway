import { MessageType } from './Wire';

export function readMessage(buffer: Buffer) {
  const message = buffer.readUInt8(6) as MessageType;

  const data = buffer.slice(7);

  return {
    message,
    data,
  };
}

export function createMessage(message: MessageType, data: Buffer) {
  const dataLength = data ? data.length : 0;
  const buffer = Buffer.alloc(7);

  buffer.writeUInt16BE(420, 0);
  buffer.writeUInt32BE(buffer.length + dataLength, 2);
  buffer.writeUInt8(message, 6);

  return Buffer.concat([buffer, data]);
}
