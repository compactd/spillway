import {
  uint8,
  build,
  uint16,
  utf8String,
  bufferLength,
  uint32,
  hexString,
} from '../src/utils';
import './test-utils';

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
