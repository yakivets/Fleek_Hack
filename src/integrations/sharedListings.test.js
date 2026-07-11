import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';

import {
  getAllSharedListings,
  getSharedListingById,
  upsertSharedListings,
} from '../../public/ebay/js/sharedListings.js';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

test('accepts an empty batch without opening or changing the database', async () => {
  assert.deepEqual(await upsertSharedListings([]), []);
  assert.deepEqual(await getAllSharedListings(), []);
});

test('atomically batch-upserts listings and returns all stored listings', async () => {
  const listings = [
    { id: 'fleek-one', name: 'One' },
    { id: 'fleek-two', name: 'Two' },
  ];

  assert.deepEqual(await upsertSharedListings(listings), listings);
  assert.deepEqual(await getAllSharedListings(), listings);
});

test('re-sharing a stable ID overwrites instead of duplicating it', async () => {
  await upsertSharedListings([{ id: 'fleek-one', name: 'Original', price: 10 }]);
  await upsertSharedListings([{ id: 'fleek-one', name: 'Updated', price: 12 }]);

  assert.deepEqual(await getAllSharedListings(), [
    { id: 'fleek-one', name: 'Updated', price: 12 },
  ]);
});

test('gets one listing by ID and returns undefined when it is missing', async () => {
  const listing = { id: 'fleek-one', name: 'One' };
  await upsertSharedListings([listing]);

  assert.deepEqual(await getSharedListingById('fleek-one'), listing);
  assert.equal(await getSharedListingById('fleek-missing'), undefined);
});

test('rejects an uncloneable batch and rolls back every write in that transaction', async () => {
  const existing = { id: 'fleek-existing', name: 'Existing' };
  await upsertSharedListings([existing]);

  await assert.rejects(
    upsertSharedListings([
      { id: 'fleek-new', name: 'Must roll back' },
      { id: 'fleek-invalid', uncloneable: () => {} },
    ]),
    { name: 'DataCloneError' },
  );

  assert.deepEqual(await getAllSharedListings(), [existing]);
});
