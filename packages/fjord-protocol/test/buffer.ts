import { isBuffer } from "util";

const {hexy} = require('hexy') as any;

export function hexDump (buff: Buffer) {
  return hexy(buff) as string;
}

// declare namespace jest {
//   export interface Matchers {
//     toEqualBuffer: typeof toEqualBuffer;
//   }
// }

export function toEqualBuffer<T>(this: jest.MatcherUtils, received: T, expected: T) {
  if (Buffer.isBuffer(received) && Buffer.isBuffer(expected)) {
    const pass = received.equals(expected)
    return {
      pass,
      message: () => pass ? `Expected good`:  `\nExpected buffer to be
\n  ${this.utils.EXPECTED_COLOR(hexDump(expected).split('\n').join('\n  '))}
  
But received instead:
  
  ${this.utils.RECEIVED_COLOR(hexDump(received).split('\n').join('\n  '))}`
    }
  } else {
    return {
      pass: false,
      message: () => `Expected a buffer but received ${received}`
    }
  }
}

expect.extend({ toEqualBuffer })

export function uint8 (val: number) {
  return {
    length: 1,
    write: (buff: Buffer, offset: number) => buff.writeUInt8(val, offset)
  }
}

export function uint16 (val: number) {
  return {
    length: 2,
    write: (buff: Buffer, offset: number) => buff.writeUInt16BE(val, offset)
  }
}

export function uint32 (val: number) {
  return {
    length: 4,
    write: (buff: Buffer, offset: number) => buff.writeUInt32BE(val, offset)
  }
}

export function bufferLength () {
  return {
    length: 4,
    write: (buff: Buffer, offset: number, length: number) => buff.writeUInt32BE(length - 2, offset)
  }
}

export function utf8String (val: string) {
  return {
    length: Buffer.byteLength(val),
    write: (buff: Buffer, offset: number) => buff.write(val, offset)
  }
}

export function build (...values: { length: number, write: (buffer: Buffer, offset: number, length: number) => number }[]) {
  const length = values.reduce((sum, { length }) => sum + length, 0);
  const buffer = Buffer.alloc(length);

  values.reduce((offset, { write }) => {
    return write(buffer, offset, length);
  }, 0);

  return buffer;
}