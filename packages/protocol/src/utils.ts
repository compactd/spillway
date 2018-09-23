import 'reflect-metadata';

export function FunctionHandler(fn?: string) {
  return (target: any, keyName: string, descriptor: PropertyDescriptor) => {
    const value = descriptor.value || (descriptor.get || (() => undefined))();
    if (!value) {
      throw new Error('Undefined value');
    }

    Reflect.defineMetadata(
      'custom:oninit',
      (instance: any) => {
        instance.socket.on(
          'fcall_' + (fn || keyName),
          async ({ cb, payload }: { cb: string; payload: any }) => {
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
    target: T,
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
          value.call(instance, data);
        });
      },
      descriptor.value,
    );
  };
}
