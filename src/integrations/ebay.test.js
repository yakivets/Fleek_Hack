import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSharedListingsModuleUrl,
  mapFleekItemToEbayProduct,
  shareFleekItemsToEbay,
} from './ebay.js';

test('maps a complete Fleek item to the eBay clone product contract', () => {
  const images = ['data:image/jpeg;base64,first', 'data:image/jpeg;base64,second'];
  const product = mapFleekItemToEbayProduct({
    id: 'item-123',
    images,
    title: 'Vintage jacket',
    category: 'Sportswear',
    brand: 'Nike',
    condition_grade: 'B',
    defects: ['Stiff zip'],
    description: 'A clean vintage track jacket.',
    suggested_price_gbp: 22.5,
    price_reasoning: 'Comparable jackets sell for £20–25.',
    status: 'draft',
  });

  assert.deepEqual(product, {
    id: 'fleek-item-123',
    name: 'Vintage jacket',
    title: 'Vintage jacket',
    category: 'Sportswear',
    brand: 'Nike',
    price: 22.5,
    currency: 'GBP',
    condition: 'Good condition',
    details: 'A clean vintage track jacket.',
    imageUrl: images,
    image: images[0],
    shipping: 0,
    watching: 0,
    isSponsored: false,
    quantity: 1,
    source: 'fleek',
    sourceMetadata: {
      id: 'item-123',
      conditionGrade: 'B',
      defects: ['Stiff zip'],
      priceReasoning: 'Comparable jackets sell for £20–25.',
      status: 'draft',
    },
  });
  assert.notEqual(product.imageUrl, images);
});

test('uses stable IDs without double-prefixing and supplies clone-safe defaults', () => {
  const product = mapFleekItemToEbayProduct({
    id: 'fleek-existing-id',
    condition_grade: 'D',
  });

  assert.equal(product.id, 'fleek-existing-id');
  assert.equal(product.name, 'Untitled item');
  assert.equal(product.title, 'Untitled item');
  assert.equal(product.category, 'Other');
  assert.equal(product.brand, 'Unbranded');
  assert.equal(product.price, 0);
  assert.equal(product.condition, 'Well worn');
  assert.deepEqual(product.imageUrl, []);
  assert.equal(product.image, '');
  assert.equal(product.details, '');
});

test('maps every supported Fleek condition grade to user-facing text', () => {
  const expected = {
    A: 'Excellent condition',
    B: 'Good condition',
    C: 'Fair condition',
    D: 'Well worn',
  };

  for (const [grade, condition] of Object.entries(expected)) {
    assert.equal(
      mapFleekItemToEbayProduct({ id: grade, condition_grade: grade }).condition,
      condition,
    );
  }
});

test('requires a source ID so shared listings remain idempotent', () => {
  assert.throws(
    () => mapFleekItemToEbayProduct({ title: 'No ID' }),
    /non-empty id/i,
  );
});

test('normalizes captured images and defects to non-empty strings', () => {
  const product = mapFleekItemToEbayProduct({
    id: 'normalized',
    images: [' first.jpg ', '', null, '   ', 'second.jpg'],
    defects: [' Scuff ', false, '', 'Loose thread'],
  });

  assert.deepEqual(product.imageUrl, ['first.jpg', 'second.jpg']);
  assert.equal(product.image, 'first.jpg');
  assert.deepEqual(product.sourceMetadata.defects, ['Scuff', 'Loose thread']);
});

test('shares the fully mapped array through one injected batch upsert', async () => {
  const items = [
    { id: 'one', title: 'One', condition_grade: 'A', images: ['one.jpg'] },
    { id: 'two', title: 'Two', condition_grade: 'C', images: ['two.jpg'] },
  ];
  const calls = [];
  const storage = {
    async upsertSharedListings(products) {
      calls.push(products);
    },
  };

  const products = await shareFleekItemsToEbay(items, storage);

  assert.deepEqual(products, items.map(mapFleekItemToEbayProduct));
  assert.deepEqual(calls, [products]);
});

test('builds the public module URL from a normalized Vite base URL', () => {
  assert.equal(
    getSharedListingsModuleUrl('/fleek-app/'),
    '/fleek-app/ebay/js/sharedListings.js',
  );
  assert.equal(getSharedListingsModuleUrl('/'), '/ebay/js/sharedListings.js');
  assert.equal(getSharedListingsModuleUrl(), '/ebay/js/sharedListings.js');
});
