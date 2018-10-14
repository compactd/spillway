import { ProtocolExtension } from '../src/ProtocolExtension';
import 'reflect-metadata';

describe('constructor', () => {
  const fn = jest.fn();

  function FooHandler() {
    return (_: any, keyName: string, descriptor: PropertyDescriptor) => {
      Reflect.defineMetadata('custom:oninit', fn, descriptor.value);
    };
  }

  class FooExt extends ProtocolExtension {
    constructor() {
      super(FooExt, 'foobar' as any);
    }
    @FooHandler()
    testFoo() {}
  }

  test('calls custom:oninit functions', () => {
    new FooExt();

    expect(fn).toHaveBeenCalled();

    expect(fn.mock.calls).toMatchObject([[expect.any(FooExt)]]);
  });
});
