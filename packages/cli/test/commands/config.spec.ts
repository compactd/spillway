import Config from '../../src/commands/config';
import { homedir } from 'os';
import { join } from 'path';

describe('config', async () => {
  beforeEach(async () => {
    // jest.spyOn(process.stdout, 'write').mockImplementation(_ => {});
  });

  afterEach(() => {});

  it('should write 512 random bytes to secret if no value', async () => {
    const writeFile = jest.fn((_, __, ___, cb) => cb());
    const readFile = jest.fn((_, cb) => cb());
    const mkdir = jest.fn((_, cb) => cb());

    const fs = { mkdir, writeFile, readFile };

    Config.fs = fs as any;

    await Config.run(['set', 'secret']);

    expect(writeFile.mock.calls).toMatchObject([
      [
        join(homedir(), '.spillway/secret'),
        expect.stringMatching(/^.{600,800}$/),
        'utf-8',
        expect.any(Function),
      ],
    ]);
  });
});
