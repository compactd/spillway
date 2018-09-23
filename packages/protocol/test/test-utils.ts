import * as getPort from 'get-port';
import * as SocketIO from 'socket.io';
import * as Client from 'socket.io-client';

import UpstreamWire from '../src/UpstreamWire';
import DownstreamWire from '../src/DownstreamWire';
import { IClient } from '../src/definitions';

const waitForExpect = require('wait-for-expect');

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createTestWires(
  cl: Partial<IClient>,
): Promise<{
  client: DownstreamWire;
  server: UpstreamWire;
  socket: SocketIO.Server;
}> {
  return new Promise(resolve => {
    getPort().then(port => {
      const server = SocketIO();
      const client = Client(`localhost:${port}`);
      server.on('connect', socket => {
        resolve({
          server: new UpstreamWire(socket, cl as IClient),
          client: new DownstreamWire(client as any),
          socket: server,
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
