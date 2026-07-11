import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategory, useStore } from './store.js';
import { indexedDbStorage } from './storage.js';

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
