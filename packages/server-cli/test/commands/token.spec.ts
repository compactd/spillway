import { promisify } from 'util';
import { mkdir, writeFile } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import * as rmfr from 'rmfr';
import Token from '../../src/commands/token';
import { verify } from 'jsonwebtoken';

describe('config', async () => {
  const stdout = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation(_ => {});

  beforeEach(async () => {
    await rmfr(join(homedir(), '.spillway'));
    await promisify(mkdir)(join(homedir(), '.spillway'));
    await promisify(writeFile)(join(homedir(), '.spillway/secret'), 'Zm9vYmFy');
  });

  it('should return correct token', async () => {
    await Token.run(['auth', 'foo']);
    const [[out]] = stdout.mock.calls as [[string]];
    const [token] = out.match(/([A-Za-z0-9\-_]+\.){2}([A-Za-z0-9\-_]+)/) as [
      string
    ];
    const { hi, hn } = verify(token, 'Zm9vYmFy') as any;

    expect(hn).toBe('foo');
    expect(hi).toHaveLength(12);
  });
});
