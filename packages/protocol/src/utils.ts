import 'reflect-metadata';
import { trace } from './logger';

export function FunctionHandler(fn?: string) {
  return (_: any, keyName: string, descriptor: PropertyDescriptor) => {
    const value = descriptor.value || (descriptor.get || (() => undefined))();
    if (!value) {
      throw new Error('Undefined value');
    }

    Reflect.defineMetadata(
      'custom:oninit',
      (instance: any) => {
        const func = 'fcall_' + (fn || keyName);
        instance.socket.on(
          func,
          async ({ cb, payload }: { cb: string; payload: any }) => {
            trace('%s(%o)', func, payload);
            const res = await value.call(instance, payload);
            instance.socket.emit(`fcallback_` + cb, { data: res });
          },
        );
      },
      descriptor.value,
    );
  };
}

export function EventHandler(fn?: string) {
  return <T extends { socket: SocketIO.Socket }>(
    _: T,
    keyName: string,
    descriptor: PropertyDescriptor,
  ) => {
    const value = descriptor.value || (descriptor.get || (() => undefined))();
    if (!value) {
      throw new Error('Undefined value');
    }

    Reflect.defineMetadata(
      'custom:oninit',
      (instance: any) => {
        instance.socket.on(fn || keyName, (data: any) => {
          trace('%s(%o)', fn || keyName, data);
          value.call(instance, data);
        });
      },
      descriptor.value,
    );
  };
}
