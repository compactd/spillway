import * as getPort from 'get-port';
import * as SocketIO from 'socket.io';
import * as Client from 'socket.io-client';

import UpstreamWire from '../src/UpstreamWire';
import DownstreamWire from '../src/DownstreamWire';

const waitForExpect = require('wait-for-expect');

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function hexDump(buff: Buffer) {
  return hexy(buff) as string;
}

export function createTestWires(): Promise<{
  client: DownstreamWire;
  server: UpstreamWire;
}> {
  return new Promise(resolve => {
    getPort().then(port => {
      const server = SocketIO();
      const client = Client(`localhost:${port}`);
      server.on('connect', socket => {
        resolve({
          server: new UpstreamWire(socket),
          client: new DownstreamWire(client as any),
        });
      });
      server.listen(port);
      client.connect();
    });
  });
}

export function waitExpectations(fn: () => void): Promise<void> {
  return waitForExpect(fn);
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
