import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSharedListingsModuleUrl,
  hasReadyStudioPhotos,
  loadSharedListingsStorage,
  mapFleekItemToEbayProduct,
  shareFleekItemsToEbay,
} from './ebay.js';

test('maps a complete Fleek item to the eBay product contract', () => {
  const images = ['data:image/jpeg;base64,studio-first', 'data:image/jpeg;base64,studio-second'];
  const product = mapFleekItemToEbayProduct({
    id: 'item-123',
    images: ['data:image/jpeg;base64,original-first', 'data:image/jpeg;base64,original-second'],
    enhanced_images: images,
    enhancement_status: 'ready',
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
    images: ['original.jpg'],
    enhanced_images: ['studio.jpg'],
    enhancement_status: 'ready',
  });

  assert.equal(product.id, 'fleek-existing-id');
  assert.equal(product.name, 'Untitled item');
  assert.equal(product.title, 'Untitled item');
  assert.equal(product.category, 'Other');
  assert.equal(product.brand, 'Unbranded');
  assert.equal(product.price, 0);
  assert.equal(product.condition, 'Well worn');
  assert.deepEqual(product.imageUrl, ['studio.jpg']);
  assert.equal(product.image, 'studio.jpg');
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
      mapFleekItemToEbayProduct({
        id: grade,
        condition_grade: grade,
        images: ['original.jpg'],
        enhanced_images: ['studio.jpg'],
        enhancement_status: 'ready',
      }).condition,
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

test('shares only normalized studio images and defects', () => {
  const product = mapFleekItemToEbayProduct({
    id: 'normalized',
    images: ['original-one.jpg', 'original-two.jpg'],
    enhanced_images: [' first.jpg ', 'second.jpg'],
    enhancement_status: 'ready',
    defects: [' Scuff ', false, '', 'Loose thread'],
  });

  assert.deepEqual(product.imageUrl, ['first.jpg', 'second.jpg']);
  assert.equal(product.image, 'first.jpg');
  assert.deepEqual(product.sourceMetadata.defects, ['Scuff', 'Loose thread']);
});

test('requires every studio photo to be ready before creating an eBay product', () => {
  const processing = {
    id: 'processing',
    images: ['one.jpg', 'two.jpg'],
    enhanced_images: ['studio-one.jpg', null],
    enhancement_status: 'processing',
  };

  assert.equal(hasReadyStudioPhotos(processing), false);
  assert.throws(() => mapFleekItemToEbayProduct(processing), /studio photos must be ready/i);
  assert.equal(
    hasReadyStudioPhotos({
      ...processing,
      enhanced_images: ['studio-one.jpg', 'studio-two.jpg'],
      enhancement_status: 'ready',
    }),
    true,
  );
});

test('shares the fully mapped array through one injected batch upsert', async () => {
  const items = [
    {
      id: 'one',
      title: 'One',
      condition_grade: 'A',
      images: ['one.jpg'],
      enhanced_images: ['studio-one.jpg'],
      enhancement_status: 'ready',
    },
    {
      id: 'two',
      title: 'Two',
      condition_grade: 'C',
      images: ['two.jpg'],
      enhanced_images: ['studio-two.jpg'],
      enhancement_status: 'ready',
    },
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

test('loads shared listing storage from bundled source code', async () => {
  const storage = await loadSharedListingsStorage();

  assert.equal(typeof storage.upsertSharedListings, 'function');
  assert.equal(typeof storage.getAllSharedListings, 'function');
  assert.equal(typeof storage.getSharedListingById, 'function');
});
