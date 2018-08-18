import Wire, { ServerMessageType, ClientMessageType } from '../src/Wire';
import { Socket, createServer, Server } from 'net';
import IWireInterface from '../src/WireInterface';
import {
  uint8,
  build,
  uint16,
  utf8String,
  bufferLength,
  BufferPart,
} from '../src/utils';
import './buffer';

import * as getPort from 'get-port';

function createTestSockets(
  wireInterface: IWireInterface,
): Promise<{ wire: Wire; client: Socket; server: Server }> {
  return new Promise((resolve, reject) => {
    const client = new Socket();

    const server = createServer(socket => {
      resolve({
        wire: new Wire(socket, wireInterface),
        client,
        server,
      });
    });
    client.setNoDelay(true);
    client.on('error', console.log);

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

function writeAndWait(socket: Socket, buffer: Buffer): Promise<Buffer> {
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

const defaultInterface: IWireInterface = {
  parseToken: () => {
    throw new Error('Not impl');
  },
  writeFilePiece: () => {
    throw new Error('Not impl');
  },
  getFilesForTorrent: () => {
    throw new Error('Not impl');
  },
  subscribeClient: () => {
    throw new Error('Not impl');
  },
  startTorrent: () => {
    throw new Error('Not impl');
  },
};

function testImmediateResponse(
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

describe('0x01 - Handshake', () => {
  it('should emit a success response', async () => {
    const parseToken = jest.fn(() => {
      throw new Error('foomessage');
    });

    await testImmediateResponse(
      { parseToken },
      uint16(420),
      bufferLength(),
      uint8(ClientMessageType.Handshake),
      utf8String('foobar'),
    ).with(
      uint16(420),
      bufferLength(),
      uint8(ServerMessageType.HandshakeResponse),
      uint8(0),
      utf8String('foomessage'),
    );

    expect(parseToken).toHaveBeenCalledWith('foobar');
  });

  it('should emit a success response', async () => {
    const parseToken = jest.fn(() => {
      return { hi: '0.0.0.0', hn: 'localhost' };
    });

    await testImmediateResponse(
      { parseToken },
      uint16(420),
      bufferLength(),
      uint8(ClientMessageType.Handshake),
      utf8String('foobar'),
    ).with(
      uint16(420),
      bufferLength(),
      uint8(ServerMessageType.HandshakeResponse),
      uint8(1),
      uint8(0),
    );

    expect(parseToken).toHaveBeenCalledWith('foobar');
  });
});
