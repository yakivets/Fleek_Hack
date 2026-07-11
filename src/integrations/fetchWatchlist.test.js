import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { fetchWatchlistProducts } from '../../public/ebay/js/fetch.js';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
};

beforeEach(() => values.clear());

test('returns a persisted watchlist array', async () => {
  const watchlist = [{ id: 'one' }];
  values.set('watchlist', JSON.stringify(watchlist));

  assert.deepEqual(await fetchWatchlistProducts(), watchlist);
});

test('returns false for malformed or non-array watchlist data', async () => {
  values.set('watchlist', '{not json');
  assert.equal(await fetchWatchlistProducts(), false);

  values.set('watchlist', JSON.stringify({ id: 'not-an-array' }));
  assert.equal(await fetchWatchlistProducts(), false);
});
