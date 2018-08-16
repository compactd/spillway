import { Socket } from 'net';
import { readMessage, createMessage } from './utils';
import IWireInterface from './WireInterface';

const debug = require('debug')('wire');

/**
 * MessageType to server
 */
export enum ClientMessageType {
  Handshake = 0x01,
  SubscribeSE = 0x03,
  StartTorrent = 0x04,
  SubscribeTE = 0x05,
  TorrentCommand = 0x07,
  RequestPieces = 0x08,
}

export enum ServerMessageType {
  HandshakeResponse = 0x02,
  ServerEvent = 0x06,
  TorrentEvent = 0x0a,
  TorrentPiece = 0x10,
}

export type MessageType = ClientMessageType | ServerMessageType;

export enum ServerEvent {
  TorrentStarted = 0x01,
  TorentFinished = 0x02,
  ClientConnected = 0x02,
}

export enum TorrentEvent {
  TorrentUpdate = 0x02,
  TorrentPieceAvailable = 0x04,
}

export default class Wire {
  private _dataReceived = 0;
  private _totalData = 0;
  private _data?: Buffer;

  hostId?: string;
  hostname?: string;
  authenticated: boolean = false;

  constructor(private socket: Socket, private wireInterface: IWireInterface) {
    socket.on('data', this._onData.bind(this));
  }

  isAuthenticated() {
    return this.authenticated && this.socket.writable;
  }

  onMessageHandshake(token: string) {
    try {
      const { hi, hn } = this.wireInterface.parseToken(token);

      this.authenticated = true;
      this.hostId = hi;
      this.hostname = hn;

      this.socket.write(
        createMessage(ServerMessageType.HandshakeResponse, Buffer.alloc(0)),
      );
    } catch (err) {
      this.socket.write(
        createMessage(
          ServerMessageType.HandshakeResponse,
          Buffer.concat([Buffer.alloc(1), Buffer.from(err.message)]),
        ),
      );
    }
  }

  private writePiece(
    hash: string,
    index: number,
    content: Buffer,
    pieceLength = content.length,
  ): void {
    if (!this.isAuthenticated()) return;

    const pieceOffset = index * content.length;
    const files = this.wireInterface.getFilesForTorrent(hash);

    const file = files.find(({ offset, length }) => {
      return offset <= pieceOffset && offset + length > pieceOffset;
    });

    if (!file) {
      throw new Error(`No file found for offset ${pieceOffset}`);
    }

    const innerOffset = file.offset - pieceOffset;
    const writeLength = length + pieceOffset - innerOffset;
    const start = pieceOffset - file.offset;

    debug('write %s (start=%d, length=%d)', file.path, start, writeLength);

    this.wireInterface.writeFilePiece(
      file.path,
      start,
      content.slice(0, writeLength),
    );

    if (writeLength < content.length) {
      debug('%d bytes of data remaining');
      return this.writePiece(
        hash,
        index + 1,
        content.slice(writeLength),
        pieceLength,
      );
    }
  }

  private _onData(data: Buffer) {
    if (!this._data) {
      const firstBytes = data.readUInt16BE(0);

      if (firstBytes !== 420) {
        throw new Error('Not fjord protocol for ' + firstBytes);
      }

      this._totalData = data.readUInt32BE(2);

      this._data = Buffer.alloc(this._totalData);

      data.slice(0).copy(this._data, this._dataReceived);

      this._dataReceived = data.length;

      debug(
        'socket sending new data (%s/%s)',
        this._dataReceived,
        this._totalData,
      );
    } else {
      data.copy(this._data, this._dataReceived);

      this._dataReceived += data.length;

      debug(
        'socket sending remaining data (%s/%s)',
        this._dataReceived,
        this._totalData,
      );
    }

    if (this._totalData === this._dataReceived) {
      this.onDataReceived(this._data);
      this._data = undefined;

      debug('socket finished receiving data');
    }
  }

  /**
   * Callnba
   * @param buffer
   */
  onDataReceived(buffer: Buffer) {
    const { message, data } = readMessage(buffer);

    debug('received %o: %d (%o)', buffer, message, data);

    switch (message) {
      case ClientMessageType.Handshake:
        this.onMessageHandshake(data.toString());
        break;
    }
  }
}
