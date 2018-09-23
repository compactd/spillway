import * as getPort from 'get-port';
import * as SocketIO from 'socket.io';
import * as Client from 'socket.io-client';

import UpstreamWire from '../src/UpstreamWire';
import DownstreamWire from '../src/DownstreamWire';

const waitForExpect = require('wait-for-expect');

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createTestWires(): Promise<{
  client: DownstreamWire;
  server: UpstreamWire;
  close: () => void;
}> {
  return new Promise(resolve => {
    getPort().then(port => {
      const server = SocketIO();
      const client = Client(`localhost:${port}`);
      server.on('connect', socket => {
        resolve({
          server: new UpstreamWire(socket),
          client: new DownstreamWire(client as any),
          close: server.close,
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
