import test from 'node:test';
import assert from 'node:assert/strict';

import { displayProducts } from '../../public/ebay/js/displayWatchlistProducts.js';

test('renders shared watchlist prices in GBP and safely escapes imported text', () => {
  const html = displayProducts([
    {
      name: '<img src=x onerror=alert(1)>',
      condition: '<script>alert(1)</script>',
      imageUrl: ['javascript:alert(1)'],
      price: 20,
      currency: 'GBP',
      discountPercentage: 0,
      shippingPrice: 0,
    },
  ]);

  assert.match(html, /£20\.00/);
  assert.doesNotMatch(html, /US &dollar;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.doesNotMatch(html, /javascript:/);
});
