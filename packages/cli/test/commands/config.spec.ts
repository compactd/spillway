import * as rmfr from 'rmfr';
import { homedir } from 'os';
import { join } from 'path';
import { readFile } from 'fs';
import Config from '../../src/commands/config';
import { promisify } from 'util';

describe('config', async () => {
  beforeEach(async () => {
    await rmfr(join(homedir(), '.spillway'));
    jest.spyOn(process.stdout, 'write').mockImplementation(_ => {});
  });

  it('should write 512 random bytes to secret if no value', async () => {
    await Config.run(['set', 'secret']);
    expect(
      Buffer.from(
        (await promisify(readFile)(
          join(homedir(), '.spillway/secret'),
        )).toString(),
        'base64',
      ),
    ).toHaveLength(512);
  });
});
