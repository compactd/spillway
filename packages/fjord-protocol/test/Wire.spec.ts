import { SmartBuffer } from 'smart-buffer';
import Wire, { ServerMessageType, ClientMessageType } from '../src/Wire';
import { Socket, createServer } from 'net';
import IWireInterface from '../src/WireInterface';
import { uint8, build, uint16, utf8String, bufferLength } from './buffer';

import * as getPort from 'get-port';

function createTestSockets(
  wireInterface: IWireInterface,
): Promise<{ wire: Wire; client: Socket }> {
  return new Promise((resolve, reject) => {
    const client = new Socket();
    const server = createServer(socket => {
      resolve({
        wire: new Wire(socket, wireInterface),
        client,
      });
    });

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
    socket.write(buffer);
    setTimeout(() => {
      if (!resolved) reject(new Error('writeAndWait timeout'));
    }, 1200);
  });
}

const defaultInterface: IWireInterface = {
  parseToken: () =>{ throw new Error('Not impl')},
  writeFilePiece: () =>{ throw new Error('Not impl')},
  getFilesForTorrent: () =>{ throw new Error('Not impl')}
}

describe('0x01 - Handshake', () => {
  it('should emit a failure response', async () => {
    const wire = {...defaultInterface, parseToken: jest.fn(() => {
      throw new Error('foomessage')
    })};

    const { client } = await createTestSockets(wire);

    const res = await writeAndWait(client, build(
      uint16(420),
      bufferLength(),
      uint8(ClientMessageType.Handshake),
      utf8String('foobar')
    ));

    expect(wire.parseToken).toHaveBeenCalledWith('foobar');

    
    expect(res).toEqualBuffer(build(
      uint16(420),
      bufferLength(),
      uint8(ServerMessageType.HandshakeResponse),
      uint8(0),
      utf8String('foomessage')
    ));
  });
});
