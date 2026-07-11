import test from 'node:test';
import assert from 'node:assert/strict';

import { renderCheckoutCart } from '../../public/ebay/js/checkoutCart.js';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.textContent = '';
    this.className = '';
    this.classList = { add: (...names) => (this.className = names.join(' ')) };
  }

  set innerHTML(_value) {
    throw new Error('checkout cart renderer must not use innerHTML');
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

const fakeDocument = {
  createElement: (tagName) => new FakeElement(tagName),
};

function find(node, tagName) {
  if (node.tagName === tagName.toUpperCase()) return node;
  for (const child of node.children ?? []) {
    const match = find(child, tagName);
    if (match) return match;
  }
  return undefined;
}

test('renders malicious persisted checkout fields as text and a normalized safe image URL', () => {
  const container = new FakeElement('div');
  renderCheckoutCart(
    container,
    [
      {
        name: '<img src=x onerror=alert(1)>',
        image: 'https://example.com/a.jpg" onerror="alert(1)',
        price: 22.5,
        currency: 'GBP',
        quantity: 2,
      },
    ],
    fakeDocument,
  );

  assert.equal(find(container, 'h6').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(
    find(container, 'img').src,
    'https://example.com/a.jpg%22%20onerror=%22alert(1)',
  );
  assert.equal(find(container, 'h5').textContent, 'Qty: 2');
  const text = JSON.stringify(container);
  assert.match(text, /£22\.50/);
});

test('omits unsafe checkout image schemes', () => {
  const container = new FakeElement('div');
  renderCheckoutCart(
    container,
    [{ name: 'Safe title', image: 'javascript:alert(1)', price: 10 }],
    fakeDocument,
  );

  assert.equal(find(container, 'img').src, undefined);
});
