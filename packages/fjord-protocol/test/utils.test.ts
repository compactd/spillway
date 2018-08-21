import {
  uint8,
  build,
  uint16,
  utf8String,
  bufferLength,
  uint32,
  hexString,
} from '../src/utils';
import { readMessage, createMessage } from '../src/utils';
import './test-utils';

describe('readMessage', () => {
  test('should return type and data as buffer', () => {
    const { message, data } = readMessage(
      build(uint16(420), bufferLength(), uint8(16), utf8String('foobar')),
    );

    expect(message).toBe(16);
    expect(data.toString()).toEqual('foobar');
  });
});

describe('writeMessage', () => {
  test('should create message', () => {
    const buffer = createMessage(16, Buffer.from('foo'));
    expect(buffer).toEqualBuffer(
      build(uint16(420), bufferLength(), uint8(16), utf8String('foo')),
    );
  });
});

describe('build()', () => {
  const buffer = build(
    uint8(42),
    uint8(0, 172, 171),
    bufferLength(),
    uint32(16),
    uint16(32, 4),
    utf8String('\u0012\u00db'),
    hexString('fe'),
  );

  const expected = Buffer.from(
    '2a00 acab 0000 0014 0000 0010 0020 0004 12c3 9bfe'.replace(/\s/g, ''),
    'hex',
  );

  it('builds a corrrect buffer', () => {
    expect(buffer).toEqualBuffer(expected);
  });
});
