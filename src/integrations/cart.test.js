import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
};
globalThis.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
};
globalThis.window = { location: { href: 'https://example.test/ebay/pages/ProductDetails.html' } };

const { Cart, addItemAndNavigate, calculateCartTotals, formatCartTotals } = await import(
  '../../public/ebay/js/cart.js'
);

beforeEach(() => values.clear());

test('adds and persists a GBP item when cart-page DOM nodes are absent', () => {
  const cart = new Cart();

  assert.doesNotThrow(() =>
    cart.addItem({
      id: 'fleek-one',
      name: 'Jacket',
      price: 20,
      currency: 'GBP',
      imageUrl: [],
    }),
  );

  assert.deepEqual(JSON.parse(values.get('cartItems')), [
    {
      id: 'fleek-one',
      name: 'Jacket',
      price: 20,
      currency: 'GBP',
      image: '',
      quantity: 1,
    },
  ]);
});

test('calculates separate totals for mixed declared currencies with USD as the default', () => {
  const totals = calculateCartTotals([
    { price: 20, quantity: 2, currency: 'GBP' },
    { price: 10, quantity: 1 },
  ]);

  assert.deepEqual(totals, {
    GBP: { subtotal: 40, shipping: 6, total: 46 },
    USD: { subtotal: 10, shipping: 1.5, total: 11.5 },
  });
});

test('navigates only after cart persistence succeeds', () => {
  const events = [];
  addItemAndNavigate(
    { addItem: (_product, quantity) => events.push(['persist', quantity]) },
    { id: 'one' },
    () => events.push('navigate'),
    4,
  );
  assert.deepEqual(events, [['persist', 4], 'navigate']);

  assert.throws(
    () =>
      addItemAndNavigate(
        {
          addItem: () => {
            throw new Error('quota exceeded');
          },
        },
        { id: 'two' },
        () => events.push('must-not-navigate'),
      ),
    /quota exceeded/,
  );
  assert.deepEqual(events, [['persist', 4], 'navigate']);
});

test('adds a clamped positive integer quantity and accumulates it for existing items', () => {
  const cart = new Cart();
  const product = {
    id: 'fleek-quantity',
    name: 'Jacket',
    price: 20,
    currency: 'GBP',
    imageUrl: [],
  };

  cart.addItem(product, '3');
  cart.addItem(product, '2.8');
  assert.equal(cart.items[0].quantity, 5);

  const secondCart = new Cart();
  secondCart.items = [];
  secondCart.addItem(product, '-4');
  assert.equal(secondCart.items[0].quantity, 1);
});

test('formats mixed-currency totals as an explicit currency breakdown', () => {
  const totals = calculateCartTotals([
    { price: 20, quantity: 1, currency: 'GBP' },
    { price: 10, quantity: 1, currency: 'USD' },
  ]);

  assert.equal(formatCartTotals(totals, 'subtotal'), '£20.00 + $10.00');
});
