import { waitExpectations } from './test-utils';
import WirePool from '../src/WirePool';
import { IClient } from '../src/definitions';

const defaultJestFn = () =>
  jest.fn(() => {
    throw new Error('Not impl');
  });

const defaultClientFactory = (): IClient => {
  return {
    addTorrent: defaultJestFn(),
    getState: defaultJestFn(),
    getPiece: defaultJestFn(),
    onAppEvent: defaultJestFn(),
    onTorrentEvent: defaultJestFn(),
  };
};

describe('constructor', () => {
  let pool: WirePool;
  const client = defaultClientFactory();
  const wireFactory = jest.fn();

  beforeEach(() => {
    wireFactory.mockReset();
    pool = new WirePool(
      {
        maxConnections: 3,
        target: 'foobar',
      },
      wireFactory,
    );
  });

  test('calls wirefactory twice', () => {
    expect(wireFactory).toHaveBeenCalledTimes(4);
  });
});
