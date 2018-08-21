import IWireInterface from '../src/WireInterface';
import Wire from '../src/Wire';
import * as getPort from 'get-port';
import * as waitForExpect from 'wait-for-expect';
import { EventEmitter } from 'events';

import { Socket, Server, createServer } from 'net';
import { BufferPart, build } from '../src/utils';

const { hexy } = require('hexy') as any;

export function hexDump(buff: Buffer) {
  return hexy(buff) as string;
}

export function createTestSockets(
  wireInterface: IWireInterface,
): Promise<{ wire: Wire; client: Socket; server: Server }> {
  return new Promise(resolve => {
    const client = new Socket();

    const server = createServer(socket => {
      resolve({
        wire: new Wire(socket, wireInterface),
        client,
        server,
      });
    });

    client.setNoDelay(true);

    getPort().then(port => {
      server.listen(port, () => {
        client.connect({
          host: 'localhost',
          port,
        });
      });
    });
  });
}

export function writeAndWait(socket: Socket, buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    socket.once('data', data => {
      resolved = true;
      resolve(data);
    });

    socket.write(buffer, () => {
      setTimeout(() => {
        if (!resolved) reject(new Error('writeAndWait timeout'));
      }, 5000);
    });
  });
}

export function waitExpectations(fn: () => void): Promise<void> {
  return waitForExpect(fn);
}

export const defaultInterface: IWireInterface = {
  parseToken: () => {
    throw new Error('Not impl');
  },
  writeFilePiece: () => {
    throw new Error('Not impl');
  },
  getFilesForTorrent: () => {
    throw new Error('Not impl');
  },
  subscribeTE: () => {
    throw new Error('Not impl');
  },
  startTorrent: () => {
    throw new Error('Not impl');
  },
};

export function testImmediateResponse(
  wireInterface: Partial<IWireInterface>,
  ...parts: BufferPart[]
) {
  return {
    with: async (...expected: BufferPart[]) => {
      const wire = {
        ...defaultInterface,
        ...wireInterface,
      };

      const { client, server } = await createTestSockets(wire);

      const res = await writeAndWait(client, build(...parts));

      expect(res).toEqualBuffer(build(...expected));

      server.close();
      client.destroy();
    },
  };
}

export function toEqualBuffer<T>(
  this: jest.MatcherUtils,
  received: T,
  expected: T,
) {
  if (Buffer.isBuffer(received) && Buffer.isBuffer(expected)) {
    const pass = received.equals(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Expected good`
          : `\nExpected buffer to be
\n  ${this.utils.EXPECTED_COLOR(
              hexDump(expected)
                .split('\n')
                .join('\n  '),
            )}

But received instead:

  ${this.utils.RECEIVED_COLOR(
    hexDump(received)
      .split('\n')
      .join('\n  '),
  )}`,
    };
  } else {
    return {
      pass: false,
      message: () => `Expected a buffer but received ${received}`,
    };
  }
}

expect.extend({ toEqualBuffer });
