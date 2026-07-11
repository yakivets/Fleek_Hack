import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCatalogQuery,
  escapeHtml,
  filterProductsByCategory,
  formatMoney,
  getProductImages,
  loadCatalogSources,
  mergeProducts,
  safeImageUrl,
  safelyParseBoolean,
  sharedListingsOrEmpty,
} from '../../public/ebay/js/ebayCatalog.js';

test('merges seed and shared products while preferring the persisted listing for duplicate IDs', () => {
  const seed = [{ id: 1, name: 'Seed' }, { id: 'same', name: 'Old' }];
  const shared = [{ id: 'same', name: 'Shared' }, { id: 'fleek-2', name: 'New' }];

  assert.deepEqual(mergeProducts(seed, shared), [
    { id: 1, name: 'Seed' },
    { id: 'same', name: 'Shared' },
    { id: 'fleek-2', name: 'New' },
  ]);
});

test('filters merged products by category case-insensitively and seeall preserves everything', () => {
  const products = [
    { id: 1, category: 'shoes' },
    { id: 2, category: 'Sportswear' },
    { id: 3 },
  ];

  assert.deepEqual(filterProductsByCategory(products, 'SPORTSWEAR'), [products[1]]);
  assert.deepEqual(filterProductsByCategory(products, 'seeall'), products);
});

test('formats declared GBP and defaults legacy products to USD', () => {
  assert.equal(formatMoney(22.5, 'GBP'), '£22.50');
  assert.equal(formatMoney('40', undefined), '$40.00');
  assert.equal(formatMoney('not-a-price', 'GBP'), '£0.00');
});

test('keeps only safe, defined image URLs including captured image data', () => {
  assert.equal(safeImageUrl('javascript:alert(1)'), '');
  assert.equal(safeImageUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(safeImageUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  assert.equal(
    safeImageUrl('../Assets/images/photo.jpg'),
    'https://example.invalid/Assets/images/photo.jpg',
  );
  assert.equal(safeImageUrl('data:image/jpeg;base64,abc'), 'data:image/jpeg;base64,abc');

  assert.deepEqual(
    getProductImages({
      imageUrl: [undefined, 'javascript:alert(1)', 'https://example.com/one.jpg'],
      image: 'https://example.com/fallback.jpg',
    }),
    ['https://example.com/one.jpg'],
  );
  assert.deepEqual(getProductImages({ image: '/ebay/photo.jpg' }), [
    'https://example.invalid/ebay/photo.jpg',
  ]);
});

test('normalizes safe image URLs instead of returning attribute-breaking raw input', () => {
  assert.equal(
    safeImageUrl('https://example.com/photo.jpg" onerror="alert(1)'),
    'https://example.com/photo.jpg%22%20onerror=%22alert(1)',
  );
});

test('falls back to no shared listings when IndexedDB reads fail', async () => {
  const errors = [];
  assert.deepEqual(
    await sharedListingsOrEmpty(
      async () => {
        throw new Error('IndexedDB blocked');
      },
      (error) => errors.push(error.message),
    ),
    [],
  );
  assert.deepEqual(errors, ['IndexedDB blocked']);
});

test('catalog source loading falls back only for shared storage and surfaces seed failures', async () => {
  assert.deepEqual(
    await loadCatalogSources(
      async () => [{ id: 'seed' }],
      async () => {
        throw new Error('IndexedDB blocked');
      },
    ),
    [[{ id: 'seed' }], []],
  );

  await assert.rejects(
    loadCatalogSources(
      async () => {
        throw new Error('seed fetch failed');
      },
      async () => [{ id: 'shared' }],
    ),
    /seed fetch failed/,
  );
});

test('escapes imported text passed to legacy template-based cart and watchlist screens', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)"> & item'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; item',
  );
});

test('composes search and independent filters from the immutable catalog', () => {
  const catalog = [
    { id: 1, name: 'Red Nike Runner', brand: 'Nike', condition: 'new', price: 90 },
    { id: 2, name: 'Blue Nike Runner', brand: 'Nike', condition: 'used', price: 120 },
    { id: 3, name: 'Red Adidas Runner', brand: 'Adidas', condition: 'new', price: 80 },
  ];

  assert.deepEqual(
    applyCatalogQuery(catalog, {
      search: 'red',
      filters: { brand: 'Nike', condition: 'new', price: 'under' },
    }),
    [catalog[0]],
  );
  assert.deepEqual(
    applyCatalogQuery(catalog, { search: 'nike', filters: { condition: 'used' } }),
    [catalog[1]],
  );
  assert.deepEqual(applyCatalogQuery(catalog, { search: 'red', filters: {} }), [
    catalog[0],
    catalog[2],
  ]);
});

test('sorts a query result without mutating the merged catalog', () => {
  const catalog = [
    { id: 1, name: 'Zulu' },
    { id: 2, name: 'Alpha' },
  ];

  assert.deepEqual(
    applyCatalogQuery(catalog, { search: '', filters: {}, sort: 'Name (A-Z)' }).map(
      ({ id }) => id,
    ),
    [2, 1],
  );
  assert.deepEqual(catalog.map(({ id }) => id), [1, 2]);
});

test('applies numeric price bands independently in each item declared currency', () => {
  const catalog = [
    { id: 'gbp-under', name: 'GBP', price: 100, currency: 'GBP' },
    { id: 'usd-under', name: 'USD', price: 100, currency: 'USD' },
    { id: 'gbp-above', name: 'GBP high', price: 200, currency: 'GBP' },
  ];

  assert.deepEqual(
    applyCatalogQuery(catalog, { filters: { price: 'under' } }).map(({ id }) => id),
    ['gbp-under', 'usd-under'],
  );
  assert.deepEqual(
    applyCatalogQuery(catalog, { filters: { price: 'above' } }).map(({ id }) => id),
    ['gbp-above'],
  );
});

test('treats malformed or non-boolean authentication storage as false', () => {
  assert.equal(safelyParseBoolean('true'), true);
  assert.equal(safelyParseBoolean('{broken'), false);
  assert.equal(safelyParseBoolean('"true"'), false);
  assert.equal(safelyParseBoolean(null), false);
});
