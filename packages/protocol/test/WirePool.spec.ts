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
        client,
      },
      wireFactory,
    );
  });

  it('creates an empty array of maxConnections length', () => {
    expect((pool as any).wires).toEqual([undefined, undefined, undefined]);
  });

  it('creates two wires', () => {
    expect(wireFactory).toHaveBeenCalledTimes(2);
    expect(wireFactory).toHaveBeenCalledWith('foobar');
  });
});

describe('getNextAvailableSocket', () => {
  const client = defaultClientFactory();
  const isReady = jest.fn();
  const wireFactory = jest.fn().mockReturnValue({
    isReady,
  });

  const pool = new WirePool(
    {
      maxConnections: 5,
      target: 'foobar',
      client,
    },
    wireFactory,
  );

  beforeEach(() => {
    wireFactory.mockClear();
  });

  it('creates the first element', () => {
    const wire = pool.getNextAvailableSocket();

    expect(wireFactory).toHaveBeenCalledTimes(1);
    expect(wireFactory).toHaveBeenCalledWith('foobar');

    expect(wire).toBeDefined();
    expect(pool.wires.filter(el => !!el)).toHaveLength(1);
  });

  it('returns first element if it is ready', () => {
    isReady.mockReturnValueOnce(true);
    const wire = pool.getNextAvailableSocket();

    expect(wireFactory).toHaveBeenCalledTimes(0);
    expect(pool.wires.filter(el => !!el)).toHaveLength(1);
  });

  it('returns first element if it is ready', () => {
    isReady.mockReturnValueOnce(true);
    const wire = pool.getNextAvailableSocket();

    expect(wireFactory).toHaveBeenCalledTimes(0);
    expect(pool.wires.filter(el => !!el)).toHaveLength(1);
  });

  it('creates a new element if first one is not ready', () => {
    isReady.mockReturnValueOnce(false);
    const wire = pool.getNextAvailableSocket();

    expect(wireFactory).toHaveBeenCalledTimes(1);
    expect(pool.wires.filter(el => !!el)).toHaveLength(2);
  });
});
