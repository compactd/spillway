import Config from '../src/Config';

describe('addRemote', () => {
  jest.setTimeout(10000);

  const writeFile = jest.fn((_, __, ___, cb) => process.nextTick(cb));
  const readFile = jest.fn((_, cb) => process.nextTick(cb));
  const mkdir = jest.fn((_, cb) => process.nextTick(cb));

  const config = new Config('/path');

  beforeAll(async () => {
    await config.addRemote('foobar', 'target', 'mytoken', {
      writeFile,
      readFile,
      mkdir,
    } as any);
  });

  test('calls mkdir twice', () => {
    expect(mkdir).toHaveBeenCalledTimes(2);
    expect(mkdir.mock.calls).toMatchObject([
      ['/path', expect.any(Function)],
      ['/path/remotes', expect.any(Function)],
    ]);
  });

  test('write file', () => {
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile.mock.calls).toMatchObject([
      [
        '/path/remotes/foobar',
        'target\nmytoken',
        'utf-8',
        expect.any(Function),
      ],
    ]);
  });
});

describe('getRemote', () => {
  jest.setTimeout(10000);

  const readFile = jest.fn((_, cb) =>
    process.nextTick(cb.bind(null, null, 'target\nmytoken')),
  );

  const config = new Config('/path');

  test('readFile', async () => {
    const { target, token } = await config.getRemote('foobar', {
      readFile,
    } as any);

    expect(readFile.mock.calls).toMatchObject([
      ['/path/remotes/foobar', expect.any(Function)],
    ]);
    expect(target).toBe('target');
    expect(token).toBe('mytoken');
  });
});

describe('getSecret', () => {
  jest.setTimeout(10000);

  const readFile = jest.fn((_, __, cb) =>
    process.nextTick(cb.bind(null, null, 'foobar')),
  );

  const config = new Config('/path');

  test('readFile', async () => {
    const secret = await config.getSecret({
      readFile,
    } as any);
    expect(readFile.mock.calls).toMatchObject([
      ['/path/secret', 'utf-8', expect.any(Function)],
    ]);

    expect(secret).toBe('foobar');
  });
});

describe('setSecret', () => {
  jest.setTimeout(10000);

  const writeFile = jest.fn((_, __, ___, cb) => process.nextTick(cb));
  const mkdir = jest.fn((_, cb) => process.nextTick(cb));

  const config = new Config('/path');

  beforeAll(async () => {
    await config.setSecret('foobar', {
      writeFile,
      mkdir,
    } as any);
  });

  test('calls mkdir twice', () => {
    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(mkdir.mock.calls).toMatchObject([['/path', expect.any(Function)]]);
  });

  test('write file', () => {
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile.mock.calls).toMatchObject([
      ['/path/secret', 'foobar', 'utf-8', expect.any(Function)],
    ]);
  });
});
