import test from 'node:test';
import assert from 'node:assert/strict';

import { getEbaySellingPath, shareDraftItems } from './shareDraftItems.js';

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
