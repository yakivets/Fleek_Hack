import test from 'node:test';
import assert from 'node:assert/strict';

import { shareMarketplaceItems } from './shareDraftItems.js';
import * as sharingHelpers from './shareDraftItems.js';

test('builds a stable product-detail link for a shared item', () => {
  assert.equal(typeof sharingHelpers.getEbayProductPath, 'function');
  assert.equal(
    sharingHelpers.getEbayProductPath('item / 1', '/fleek-app/'),
    '/fleek-app/ebay/pages/ProductDetails.html?id=fleek-item%20%2F%201',
  );
});

test('marketplace sharing persists pending eBay items before marking exactly those IDs', async () => {
  const items = [
    { id: 'pending', marketplace_posts: { ebay: false } },
    { id: 'already-shared', marketplace_posts: { ebay: true } },
  ];
  const events = [];
  const shared = await shareMarketplaceItems({
    items,
    beginSharing: () => true,
    finishSharing: () => events.push('finish'),
    shareItems: async (pending) => events.push(['persist', pending.map(({ id }) => id)]),
    markItemsPosted: (ids) => events.push(['mark', ids]),
  });

  assert.deepEqual(shared, [items[0]]);
  assert.deepEqual(events, [
    ['persist', ['pending']],
    ['mark', ['pending']],
    'finish',
  ]);
});

test('marketplace sharing does not mark on persistence failure and allows retry', async () => {
  const events = [];
  let attempts = 0;
  const dependencies = {
    items: [{ id: 'pending', marketplace_posts: { ebay: false } }],
    beginSharing: () => true,
    finishSharing: () => events.push('finish'),
    shareItems: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('persistence failed');
      events.push('persisted');
    },
    markItemsPosted: (ids) => events.push(['mark', ids]),
  };

  const firstError = await shareMarketplaceItems(dependencies).then(
    () => null,
    (error) => error,
  );
  assert.match(firstError?.message || '', /persistence failed/);
  assert.deepEqual(events, ['finish']);

  const shared = await shareMarketplaceItems(dependencies);
  assert.deepEqual(shared.map(({ id }) => id), ['pending']);
  assert.deepEqual(events, ['finish', 'persisted', ['mark', ['pending']], 'finish']);
});

test('marketplace sharing rejects duplicate submissions while the global lock is held', async () => {
  let locked = false;
  let releasePersistence;
  let persistenceCalls = 0;
  const dependencies = {
    items: [{ id: 'pending', marketplace_posts: { ebay: false } }],
    beginSharing: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
    finishSharing: () => {
      locked = false;
    },
    shareItems: async () => {
      persistenceCalls += 1;
      await new Promise((resolve) => {
        releasePersistence = resolve;
      });
    },
    markItemsPosted: () => {},
  };

  const first = shareMarketplaceItems(dependencies);
  const duplicate = await shareMarketplaceItems(dependencies);

  assert.deepEqual(duplicate, []);
  assert.equal(persistenceCalls, 1);
  releasePersistence();
  await first;
  assert.equal(locked, false);
});
