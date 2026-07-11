import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEbaySellingPath,
  shareDraftItems,
  shareMarketplaceItems,
} from './shareDraftItems.js';

test('builds the selling path from root and non-root Vite base URLs', () => {
  assert.equal(getEbaySellingPath('/'), '/ebay/pages/selling.html');
  assert.equal(getEbaySellingPath('/fleek-app/'), '/fleek-app/ebay/pages/selling.html');
  assert.equal(getEbaySellingPath('/fleek-app'), '/fleek-app/ebay/pages/selling.html');
});

test('shares one draft snapshot, then marks exactly those IDs posted before navigating', async () => {
  const draftOne = { id: 'one', status: 'draft' };
  const posted = { id: 'two', status: 'posted' };
  const draftThree = { id: 'three', status: 'draft' };
  const items = [draftOne, posted, draftThree];
  const events = [];

  const shared = await shareDraftItems({
    items,
    shareItems: async (drafts) => {
      events.push(['share', drafts]);
      items.push({ id: 'late-draft', status: 'draft' });
    },
    markItemsPosted: (ids) => events.push(['mark', ids]),
    onSuccess: (drafts) => events.push(['success', drafts]),
    navigate: (path) => events.push(['navigate', path]),
  });

  assert.deepEqual(shared, [draftOne, draftThree]);
  assert.deepEqual(events, [
    ['share', [draftOne, draftThree]],
    ['mark', ['one', 'three']],
    ['success', [draftOne, draftThree]],
    ['navigate', '/ebay/pages/selling.html'],
  ]);
});

test('does not mark or navigate when batch persistence fails and permits a later retry', async () => {
  const items = [{ id: 'one', status: 'draft' }];
  const events = [];
  let attempts = 0;
  const shareItems = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('IndexedDB unavailable');
    events.push('shared');
  };
  const dependencies = {
    items,
    shareItems,
    markItemsPosted: (ids) => events.push(['mark', ids]),
    onSuccess: () => events.push('success'),
    navigate: (path) => events.push(['navigate', path]),
  };

  await assert.rejects(shareDraftItems(dependencies), /IndexedDB unavailable/);
  assert.deepEqual(events, []);

  await shareDraftItems(dependencies);
  assert.deepEqual(events, [
    'shared',
    ['mark', ['one']],
    'success',
    ['navigate', '/ebay/pages/selling.html'],
  ]);
});

test('does nothing when no drafts are supplied', async () => {
  const calls = [];

  const shared = await shareDraftItems({
    items: [{ id: 'posted', status: 'posted' }],
    shareItems: async () => calls.push('share'),
    markItemsPosted: () => calls.push('mark'),
    navigate: () => calls.push('navigate'),
  });

  assert.deepEqual(shared, []);
  assert.deepEqual(calls, []);
});

test('allows only one rapid share and releases the global lock afterward', async () => {
  let isSharing = false;
  let finishPersistence;
  let persistenceCalls = 0;
  const beginSharing = () => {
    if (isSharing) return false;
    isSharing = true;
    return true;
  };
  const finishSharing = () => {
    isSharing = false;
  };
  const dependencies = {
    items: [{ id: 'one', status: 'draft' }],
    beginSharing,
    finishSharing,
    shareItems: async () => {
      persistenceCalls += 1;
      await new Promise((resolve) => {
        finishPersistence = resolve;
      });
    },
    markItemsPosted: () => {},
    navigate: () => {},
  };

  const firstShare = shareDraftItems(dependencies);
  const secondShare = shareDraftItems(dependencies);

  assert.equal(isSharing, true);
  assert.equal(persistenceCalls, 1);
  assert.deepEqual(await secondShare, []);

  finishPersistence();
  assert.equal((await firstShare).length, 1);
  assert.equal(isSharing, false);
});

test('releases the global lock after failure so a retry can start', async () => {
  let isSharing = false;
  let attempts = 0;
  const dependencies = {
    items: [{ id: 'one', status: 'draft' }],
    beginSharing: () => {
      if (isSharing) return false;
      isSharing = true;
      return true;
    },
    finishSharing: () => {
      isSharing = false;
    },
    shareItems: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('persistence failed');
    },
    markItemsPosted: () => {},
    navigate: () => {},
  };

  await assert.rejects(shareDraftItems(dependencies), /persistence failed/);
  assert.equal(isSharing, false);

  assert.equal((await shareDraftItems(dependencies)).length, 1);
  assert.equal(attempts, 2);
  assert.equal(isSharing, false);
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
