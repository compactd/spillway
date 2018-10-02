import FSTorrentStorage from '../src/FSTorrentStorage';
import { promisify } from 'util';
import { readFile, mkdir } from 'fs';
import * as rmfr from 'rmfr';

const preadFile = promisify(readFile);
const pmkdir = promisify(mkdir);

const store = new FSTorrentStorage({
  pieceLength: 3,
  length: 5,
  path: '/tmp/fstest',
  files: [
    {
      path: 'foo',
      offset: 0,
      length: 3,
    },
    {
      path: 'bar',
      offset: 3,
      length: 1,
    },
    {
      path: 'foobar',
      offset: 4,
      length: 3,
    },
    {
      path: 'barz',
      offset: 7,
      length: 6,
    },
  ],
});

test('FSTorrentStorage#put', async () => {
  await rmfr('/tmp/fstest');
  await pmkdir('/tmp/fstest');

  await store.put(0, Buffer.from([1, 2, 3]));
  await store.close();

  expect(await preadFile('/tmp/fstest/foo')).toEqual(Buffer.from([1, 2, 3]));

  await store.put(1, Buffer.from([4, 5, 6]));
  await store.close();

  expect(await preadFile('/tmp/fstest/foo')).toEqual(Buffer.from([1, 2, 3]));
  expect(await preadFile('/tmp/fstest/bar')).toEqual(Buffer.from([4]));
  expect(await preadFile('/tmp/fstest/foobar')).toEqual(Buffer.from([5, 6]));

  await store.put(2, Buffer.from([7, 8, 9]));
  await store.close();

  expect(await preadFile('/tmp/fstest/foo')).toEqual(Buffer.from([1, 2, 3]));
  expect(await preadFile('/tmp/fstest/bar')).toEqual(Buffer.from([4]));
  expect(await preadFile('/tmp/fstest/foobar')).toEqual(Buffer.from([5, 6, 7]));
  expect(await preadFile('/tmp/fstest/barz')).toEqual(Buffer.from([8, 9]));

  await store.put(4, Buffer.from([13]));

  expect(await preadFile('/tmp/fstest/foo')).toEqual(Buffer.from([1, 2, 3]));
  expect(await preadFile('/tmp/fstest/bar')).toEqual(Buffer.from([4]));
  expect(await preadFile('/tmp/fstest/foobar')).toEqual(Buffer.from([5, 6, 7]));
  expect(await preadFile('/tmp/fstest/barz')).toEqual(
    new Buffer([8, 9, 0, 0, 0, 13]),
  );

  await store.put(3, Buffer.from([10, 11, 12]));

  expect(await preadFile('/tmp/fstest/foo')).toEqual(Buffer.from([1, 2, 3]));
  expect(await preadFile('/tmp/fstest/bar')).toEqual(Buffer.from([4]));
  expect(await preadFile('/tmp/fstest/foobar')).toEqual(Buffer.from([5, 6, 7]));
  expect(await preadFile('/tmp/fstest/barz')).toEqual(
    new Buffer([8, 9, 10, 11, 12, 13]),
  );
});

test('FSTorrentStorage#get', async () => {
  expect(await store.get(0)).toEqual(Buffer.from([1, 2, 3]));
  expect(await store.get(1)).toEqual(Buffer.from([4, 5, 6]));
  expect(await store.get(2)).toEqual(Buffer.from([7, 8, 9]));
  expect(await store.get(3)).toEqual(Buffer.from([10, 11, 12]));
  expect(await store.get(4)).toEqual(Buffer.from([13]));

  await store.close();
});
