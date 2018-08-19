import Wire, { ServerMessageType, ClientMessageType } from '../src/Wire';
import { Socket, createServer, Server } from 'net';
import IWireInterface, {
  TorrentEvent,
  TorrentStatus,
} from '../src/WireInterface';
import {
  uint8,
  build,
  uint16,
  utf8String,
  bufferLength,
  BufferPart,
  hexString,
  uint32,
} from '../src/utils';
import './buffer';

import * as getPort from 'get-port';
import { toEqualBuffer } from './buffer';
import { doesNotReject } from 'assert';
import * as waitForExpect from 'wait-for-expect';

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
  subscribeTE: () => {
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

test('0x04 - start torrent', async () => {
  const wireInterface = {
    ...defaultInterface,
    startTorrent: jest.fn(),
  };

  const { client, server, wire } = await createTestSockets(wireInterface);
  wire.authenticated = true;

  client.write(
    build(
      uint16(420),
      bufferLength(),
      uint8(ClientMessageType.StartTorrent),
      utf8String('barbar'),
    ),
  );

  await waitForExpect(() => {
    expect(wireInterface.startTorrent).toHaveBeenCalledWith(
      Buffer.from('barbar'),
    );
  });

  server.close();
  client.destroy();
});

describe('0x05 - subscribe to torrent specific events', () => {
  const wireInterface = {
    ...defaultInterface,
    subscribeTE: jest.fn(),
  };

  const hash = 'ddc691962b2dfdde74958ad4dd8bde859e476d33';

  let wire: Wire, server: Server, client: Socket;

  beforeAll(async () => {
    const test = await createTestSockets(wireInterface);
    wire = test.wire;
    server = test.server;
    client = test.client;

    client.write(
      build(
        uint16(420),
        bufferLength(),
        uint8(ClientMessageType.SubscribeTE),
        hexString(hash),
        uint8(TorrentEvent.TorrentPiece | TorrentEvent.TorrentUpdate),
      ),
    );
  });

  afterAll(() => {
    server.close();
    client.destroy();
  });

    expect(wireInterface.subscribeTE).toHaveBeenCalledWith(
      hash,
      TorrentEvent.TorrentPiece,
      wire.onTorrentEvent,
    );
  it('calls subscribe', () => {

    expect(wireInterface.subscribeTE).toHaveBeenCalledWith(
      hash,
      TorrentEvent.TorrentUpdate,
      wire.onTorrentEvent,
    );
  });

  it('callbacks propagate for piece', () => {
    client.on('data', (data: Buffer) => {
      expect(data).toEqualBuffer(
        build(
          uint16(420),
          bufferLength(),
          uint8(ServerMessageType.TorrentEvent),
          hexString(hash),
          uint32(1),
          uint32(2),
          uint32(1337),
        ),
      );
      done();
    });

    wire.onTorrentEvent(hash, TorrentEvent.TorrentPiece, {
      pieces: Uint32Array.from([1, 2, 1337]),
    });
  });
  it('callbacks propagate for update', () => {
    client.on('data', (data: Buffer) => {
      expect(data).toEqualBuffer(
        build(
          uint16(420),
          bufferLength(),
          uint8(ServerMessageType.TorrentEvent),
          hexString(hash),
          uint32(1),
          uint32(2),
          uint32(1337),
        ),
      );
      done();
    });

    wire.onTorrentEvent(hash, TorrentEvent.TorrentUpdate, {
      status: TorrentStatus.Downloading,
      peers: 25,
      downloaded: 42,
      uploaded: 50,
      downloadSpeed: 3,
      uploadSpeed: 4,
    });
  });
});
