const { hexy } = require('hexy') as any;

export function hexDump(buff: Buffer) {
  return hexy(buff) as string;
}

// declare namespace jest {
//   export interface Matchers {
//     toEqualBuffer: typeof toEqualBuffer;
//   }
// }

export function toEqualBuffer<T>(
  this: jest.MatcherUtils,
  received: T,
  expected: T,
) {
  if (Buffer.isBuffer(received) && Buffer.isBuffer(expected)) {
    const pass = received.equals(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Expected good`
          : `\nExpected buffer to be
\n  ${this.utils.EXPECTED_COLOR(
              hexDump(expected)
                .split('\n')
                .join('\n  '),
            )}

But received instead:

  ${this.utils.RECEIVED_COLOR(
    hexDump(received)
      .split('\n')
      .join('\n  '),
  )}`,
    };
  } else {
    return {
      pass: false,
      message: () => `Expected a buffer but received ${received}`,
    };
  }
}

expect.extend({ toEqualBuffer });
