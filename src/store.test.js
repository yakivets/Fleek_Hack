import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategory, useStore } from './store.js';
import { indexedDbStorage } from './storage.js';

const initialItems = [
  { id: 'draft-one', status: 'draft', title: 'One' },
  { id: 'posted', status: 'posted', title: 'Two' },
  { id: 'draft-three', status: 'draft', title: 'Three' },
];

beforeEach(() => {
  useStore.setState({
    items: initialItems.map((item) => ({ ...item })),
    bundles: [],
    activeBundleId: null,
    captureMode: 'single',
    isSharingToEbay: false,
  });
});

test('normalizes mixed AI category labels into stable bundle groups', () => {
  assert.equal(normalizeCategory("Men's Baseball Caps"), 'Caps & hats');
  assert.equal(normalizeCategory("Women's Denim Jeans"), 'Jeans');
  assert.equal(normalizeCategory('Vintage Graphic T-Shirt'), 'T-Shirts');
  assert.equal(normalizeCategory('Unisex Wool Cardigan'), 'Knitwear');
});

test('keeps an understandable fallback for an unknown category', () => {
  assert.equal(normalizeCategory("Women's Playsuits"), 'Playsuits');
  assert.equal(normalizeCategory(''), 'Other');
});

test('creates, groups, moves, and finishes a bundle session', () => {
  useStore.setState({
    items: [],
    bundles: [],
    activeBundleId: null,
    captureMode: 'single',
    marketplaceConnections: { vinted: false, ebay: false },
  });

  const bundleId = useStore.getState().startBundle('Mixed lot');
  useStore.getState().addItem({
    id: 'jeans-1',
    title: 'Blue jeans',
    category: "Women's Denim Jeans",
    images: [],
    defects: [],
    status: 'draft',
    suggested_price_gbp: 20,
  });
  useStore.getState().updateItem('jeans-1', { bundle_id: bundleId });

  assert.equal(useStore.getState().captureMode, 'bundle');
  assert.equal(useStore.getState().items[0].category_key, 'Jeans');

  const draft = useStore.getState().items[0];
  useStore.getState().updateItem('jeans-1', { ...draft, category: 'Baseball cap' });
  assert.equal(useStore.getState().items[0].category_key, 'Caps & hats');

  useStore.getState().updateItem('jeans-1', { category_key: 'Trousers' });
  assert.equal(useStore.getState().items[0].category_key, 'Trousers');

  useStore.getState().connectMarketplace('vinted');
  useStore.getState().postItemToMarketplace('jeans-1', 'vinted');
  assert.equal(useStore.getState().marketplaceConnections.vinted, true);
  assert.equal(useStore.getState().items[0].marketplace_posts.vinted, true);

  useStore.getState().connectMarketplace('ebay');
  useStore.getState().postBundleToMarketplace(bundleId, 'ebay');
  assert.equal(useStore.getState().items[0].marketplace_posts.ebay, true);
  assert.equal(useStore.getState().items[0].status, 'posted');

  useStore.getState().finishBundle(bundleId);
  assert.equal(useStore.getState().bundles[0].status, 'finished');
  assert.equal(useStore.getState().activeBundleId, null);
  assert.equal(useStore.getState().captureMode, 'single');

  useStore.getState().removeItem('jeans-1');
  assert.equal(useStore.getState().items.length, 0);
});

test('persistence storage keeps a fallback when IndexedDB is unavailable', async () => {
  await indexedDbStorage.setItem('test-key', 'saved');
  assert.equal(await indexedDbStorage.getItem('test-key'), 'saved');
  await indexedDbStorage.removeItem('test-key');
  assert.equal(await indexedDbStorage.getItem('test-key'), null);
});

test('marks supplied item IDs posted in one store update and leaves other records unchanged', () => {
  const before = useStore.getState().items;
  let updates = 0;
  const unsubscribe = useStore.subscribe(() => {
    updates += 1;
  });

  useStore.getState().markItemsPosted(new Set(['draft-one', 'draft-three']));
  unsubscribe();

  const after = useStore.getState().items;
  assert.equal(updates, 1);
  assert.equal(after[0].status, 'posted');
  assert.equal(after[0].marketplace_posts.ebay, true);
  assert.equal(after[2].status, 'posted');
  assert.equal(after[2].marketplace_posts.ebay, true);
  assert.strictEqual(after[1], before[1]);
});

test('accepts an empty ID list without changing store state', () => {
  const before = useStore.getState().items;
  let updates = 0;
  const unsubscribe = useStore.subscribe(() => {
    updates += 1;
  });

  useStore.getState().markItemsPosted([]);
  unsubscribe();

  assert.equal(updates, 0);
  assert.strictEqual(useStore.getState().items, before);
});

test('undoes one item posting and clears all stale marketplace metadata atomically', () => {
  useStore.setState({
    items: [
      {
        id: 'posted',
        status: 'posted',
        marketplace_posts: { ebay: true, vinted: true },
      },
      {
        id: 'untouched',
        status: 'posted',
        marketplace_posts: { ebay: true, vinted: false },
      },
    ],
  });
  const untouchedBefore = useStore.getState().items[1];
  let updates = 0;
  const unsubscribe = useStore.subscribe(() => {
    updates += 1;
  });

  useStore.getState().undoItemPosting('posted');
  unsubscribe();

  const after = useStore.getState().items;
  assert.equal(updates, 1);
  assert.deepEqual(after[0], {
    id: 'posted',
    status: 'draft',
    marketplace_posts: { ebay: false, vinted: false },
  });
  assert.strictEqual(after[1], untouchedBefore);
});

test('acquires the eBay sharing lock once and releases it for retry', () => {
  assert.equal(useStore.getState().beginEbayShare(), true);
  assert.equal(useStore.getState().isSharingToEbay, true);
  assert.equal(useStore.getState().beginEbayShare(), false);

  useStore.getState().finishEbayShare();

  assert.equal(useStore.getState().isSharingToEbay, false);
  assert.equal(useStore.getState().beginEbayShare(), true);
});
