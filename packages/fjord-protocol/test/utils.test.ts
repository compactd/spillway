
import { uint8, build, uint16, utf8String, bufferLength } from './buffer';
import { readMessage, createMessage } from '../src/utils';


describe('readMessage', () => {
  test('should return type and data as buffer', () => {
    const { message, data } = readMessage(build(
      uint16(420), bufferLength(), uint8(16), utf8String('foobar')
    ));
    
    expect(message).toBe(16);
    expect(data.toString()).toEqual('foobar');
  })
})

describe('writeMessage', () => {
  test('should create message', () => {
    
    const buffer = createMessage(16, Buffer.from('foo'));
    expect(buffer).toEqualBuffer(build(uint16(420), bufferLength(), uint8(16), utf8String('foo')));
  })
})