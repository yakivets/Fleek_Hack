import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useStore } from './store.js';

const initialItems = [
  { id: 'draft-one', status: 'draft', title: 'One' },
  { id: 'posted', status: 'posted', title: 'Two' },
  { id: 'draft-three', status: 'draft', title: 'Three' },
];

beforeEach(() => {
  useStore.setState({
    items: initialItems.map((item) => ({ ...item })),
    isSharingToEbay: false,
  });
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
  assert.equal(after[2].status, 'posted');
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

test('acquires the eBay sharing lock once and releases it for retry', () => {
  assert.equal(useStore.getState().beginEbayShare(), true);
  assert.equal(useStore.getState().isSharingToEbay, true);
  assert.equal(useStore.getState().beginEbayShare(), false);

  useStore.getState().finishEbayShare();

  assert.equal(useStore.getState().isSharingToEbay, false);
  assert.equal(useStore.getState().beginEbayShare(), true);
});
