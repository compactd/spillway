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
import {
  testImmediateResponse,
  createTestSockets,
  waitExpectations,
  defaultInterface,
  delay,
  writeAndWait,
} from './test-utils';

describe('0x01 - Handshake', () => {
  it('should emit a failure response with parseToken throwing', async () => {
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

  it('should emit a success response with parseToken returning object', async () => {
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

  it('should support sliced packets', async () => {
    const parseToken = jest.fn(() => {
      return { hi: '0.0.0.0', hn: 'localhost' };
    });

    const wire = {
      ...defaultInterface,
      parseToken,
    };

    const { client, server } = await createTestSockets(wire);
    client.setNoDelay(true);

    const buff = build(
      uint16(420),
      bufferLength(),
      uint8(ClientMessageType.Handshake),
      utf8String('foobar'),
    );

    client.write(buff.slice(0, 7));

    await delay(500);

    const res = await writeAndWait(client, buff.slice(7));

    expect(res).toEqualBuffer(
      build(
        uint16(420),
        bufferLength(),
        uint8(ServerMessageType.HandshakeResponse),
        uint8(1),
        uint8(0),
      ),
    );

    server.close();
    client.destroy();
  });
});

describe('0x04 - start torrent', () => {
  const wireInterface = {
    ...defaultInterface,
    startTorrent: jest.fn(),
  };

  test('calls startTorrent', async () => {
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
    await waitExpectations(() => {
      expect(wireInterface.startTorrent).toHaveBeenCalledWith(
        Buffer.from('barbar'),
      );
    });
    server.close();
    client.destroy();
  });
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
    wire.authenticated = true;
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

  const byType: { [evt: number]: any } = {};

  it('calls subscribeTE for each event masked', async () => {
    await waitExpectations(() => {
      expect(wireInterface.subscribeTE).toHaveBeenCalledWith(
        hash,
        TorrentEvent.TorrentPiece,
        expect.any(Function),
      );

      expect(wireInterface.subscribeTE).toHaveBeenCalledWith(
        hash,
        TorrentEvent.TorrentUpdate,
        expect.any(Function),
      );
    });

    Object.assign(
      byType,
      wireInterface.subscribeTE.mock.calls.reduce((acc, [info, evt, cb]) => {
        return { ...acc, [evt]: cb };
      }, {}),
    );
  });

  it('sends 0x10 packet with indexes when callback called', async () => {
    const cb = jest.fn();
    client.on('data', cb);

    byType[TorrentEvent.TorrentPiece]({
      pieces: Uint32Array.from([1, 2, 1337]),
    });

    await waitExpectations(() => {
      build(
        uint16(420),
        bufferLength(),
        uint8(ServerMessageType.TorrentEvent),
        hexString(hash),
        uint8(TorrentEvent.TorrentPiece),
        uint32(1, 2, 1337),
      );
    });
  });
  it('sends 0x10 packet with stats when callback called', async () => {
    const cb = jest.fn();
    client.on('data', cb);

    byType[TorrentEvent.TorrentUpdate]({
      status: TorrentStatus.Downloading,
      peers: 25,
      downloaded: 42,
      uploaded: 50,
      downloadSpeed: 3,
      uploadSpeed: 4,
    });

    await waitExpectations(() => {
      expect(cb.mock.calls[0][0]).toEqualBuffer(
        build(
          uint16(420),
          bufferLength(),
          uint8(ServerMessageType.TorrentEvent),
          hexString(hash),
          uint8(TorrentEvent.TorrentUpdate),
          uint8(2, 25),
          uint32(42, 50, 3, 4),
        ),
      );
    });
  });
});
