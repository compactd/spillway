export abstract class ProtocolExtension {
  constructor(child: { prototype: any }, protected socket: SocketIO.Socket) {
    Object.getOwnPropertyNames(child.prototype).forEach(name => {
      (Reflect.getMetadata('custom:oninit', (this as any)[name]) || (() => {}))(
        this,
      );
    });
  }
}
