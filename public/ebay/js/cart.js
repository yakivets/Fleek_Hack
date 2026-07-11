import { formatMoney, safeImageUrl } from './ebayCatalog.js';

function currencyCode(currency) {
  return typeof currency === 'string' && currency.toUpperCase() === 'GBP' ? 'GBP' : 'USD';
}

function positiveQuantity(value) {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

export function addItemAndNavigate(cart, product, navigate, quantity = 1) {
  cart.addItem(product, quantity);
  navigate();
}

export function calculateCartTotals(items, shippingRate = 0.15) {
  const totals = {};
  for (const item of items) {
    const currency = currencyCode(item.currency);
    const price = Number(item.price);
    const quantity = positiveQuantity(item.quantity);
    if (!totals[currency]) totals[currency] = { subtotal: 0, shipping: 0, total: 0 };
    totals[currency].subtotal +=
      (Number.isFinite(price) ? price : 0) * quantity;
  }
  for (const values of Object.values(totals)) {
    values.shipping = values.subtotal * shippingRate;
    values.total = values.subtotal + values.shipping;
  }
  return totals;
}

export function formatCartTotals(totals, field) {
  const values = Object.entries(totals).map(([currency, total]) =>
    formatMoney(total[field], currency),
  );
  return values.length > 0 ? values.join(' + ') : formatMoney(0, 'USD');
}

function setText(id, value) {
  const element = globalThis.document?.getElementById(id);
  if (element) element.textContent = String(value);
}

function setSignedInGreeting() {
  try {
    if (!JSON.parse(globalThis.localStorage?.getItem('isAuthenticated') ?? 'false')) return;
  } catch {
    return;
  }
  const signButton = globalThis.document?.querySelector('.sign-btn');
  if (signButton) {
    signButton.textContent = `Hi! ${globalThis.localStorage?.getItem('userName') ?? ''}`;
  }
}

function createElement(tagName, text, className = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text != null) element.textContent = String(text);
  return element;
}

setSignedInGreeting();

export class Cart {
  constructor() {
    try {
      const stored = JSON.parse(globalThis.localStorage?.getItem('cartItems') ?? '[]');
      this.items = Array.isArray(stored) ? stored : [];
    } catch {
      this.items = [];
    }

    if (globalThis.window?.location?.href?.includes('CartPage.html')) {
      this.refreshCartPage();
      this.assignToCheckoutButton();
    }
  }

  refreshCartPage() {
    this.displayCart();
    this.calculateNumOfItems();
    this.calculateSubTotal();
    this.calculateShipping();
    this.calculateTotal();
  }

  addItem(product, quantity = 1) {
    const amount = positiveQuantity(quantity);
    const existingItem = this.items.find((item) => String(item.id) === String(product.id));
    if (existingItem) {
      existingItem.quantity = positiveQuantity(existingItem.quantity) + amount;
      existingItem.currency = currencyCode(product.currency);
    } else {
      this.items.push({
        id: product.id,
        name: typeof product.name === 'string' ? product.name : 'Untitled item',
        price: Number.isFinite(Number(product.price)) ? Number(product.price) : 0,
        currency: currencyCode(product.currency),
        image: safeImageUrl(product.imageUrl?.[0] ?? product.image),
        quantity: amount,
      });
    }

    this.saveToLocalStorage();
    this.displayCart();
    this.calculateNumOfItems();
    return this.items;
  }

  removeItem(productId) {
    this.items = this.items.filter((item) => String(item.id) !== String(productId));
    this.saveToLocalStorage();
    this.refreshCartPage();
  }

  saveToLocalStorage() {
    if (!globalThis.localStorage) throw new Error('Cart storage is unavailable');
    globalThis.localStorage.setItem('cartItems', JSON.stringify(this.items));
  }

  calculateNumOfItems() {
    const totalItems = this.items.reduce(
      (total, item) => total + (Number.parseInt(item.quantity, 10) || 0),
      0,
    );
    setText('realQty', totalItems);
    globalThis.localStorage?.setItem('totalItems', String(totalItems));
    return totalItems;
  }

  getTotals() {
    return calculateCartTotals(this.items);
  }

  calculateSubTotal() {
    const subtotal = formatCartTotals(this.getTotals(), 'subtotal');
    globalThis.localStorage?.setItem('subTotal', subtotal);
    setText('realP', subtotal);
    return subtotal;
  }

  calculateShipping() {
    const shipping = formatCartTotals(this.getTotals(), 'shipping');
    globalThis.localStorage?.setItem('shipping', shipping);
    setText('shipCharge', shipping);
    return shipping;
  }

  calculateTotal() {
    const total = formatCartTotals(this.getTotals(), 'total');
    globalThis.localStorage?.setItem('total', total);
    setText('totalAmount', total);
    return total;
  }

  checkout() {
    const total = this.calculateTotal();
    globalThis.localStorage?.setItem('total', total);
    if (globalThis.window?.location) globalThis.window.location.href = 'CheckoutPage.html';
  }

  assignToCheckoutButton() {
    const checkoutButton = globalThis.document?.getElementById('go-to-checkout-btn');
    checkoutButton?.addEventListener('click', () => this.checkout());
  }

  increaseQuantity(itemId) {
    const existingItem = this.items.find((item) => String(item.id) === String(itemId));
    if (!existingItem) return;
    existingItem.quantity = (Number.parseInt(existingItem.quantity, 10) || 0) + 1;
    this.saveToLocalStorage();
    this.refreshCartPage();
  }

  decreaseQuantity(itemId) {
    const existingItem = this.items.find((item) => String(item.id) === String(itemId));
    if (!existingItem) return;
    existingItem.quantity = Math.max((Number.parseInt(existingItem.quantity, 10) || 1) - 1, 1);
    this.saveToLocalStorage();
    this.refreshCartPage();
  }

  updateCartItemQuantity(itemId, quantity) {
    const existingItem = this.items.find((item) => String(item.id) === String(itemId));
    if (!existingItem) return;
    existingItem.quantity = Math.max(Number.parseInt(quantity, 10) || 1, 1);
    this.saveToLocalStorage();
    this.refreshCartPage();
  }

  displayCart() {
    const cartContainer = globalThis.document?.getElementById('cartData');
    if (!cartContainer) return;
    cartContainer.replaceChildren();

    for (const item of this.items) {
      const card = createElement('div', null, 'productDetails');
      const row = createElement('div', null, 'row align-items-center py-3');
      const imageColumn = createElement('div', null, 'col');
      const image = createElement('img', null, 'img-fluid');
      const imageSource = safeImageUrl(item.image);
      if (imageSource) image.src = imageSource;
      image.alt = typeof item.name === 'string' ? item.name : 'Cart item';
      imageColumn.appendChild(image);

      const nameColumn = createElement('div', null, 'col');
      nameColumn.appendChild(createElement('h3', item.name, 'card-title'));

      const quantityColumn = createElement('div', null, 'col');
      quantityColumn.appendChild(createElement('h3', 'Qty'));
      const quantityGroup = createElement('div', null, 'input-group');
      const decrease = createElement('button', '-', 'btn btn-outline-primary decrease');
      decrease.type = 'button';
      decrease.dataset.itemId = String(item.id);
      const quantity = createElement('input', null, 'form-control form-control-sm quantity');
      quantity.type = 'text';
      quantity.value = String(item.quantity || 1);
      quantity.dataset.itemId = String(item.id);
      const increase = createElement('button', '+', 'btn btn-outline-primary increase');
      increase.type = 'button';
      increase.dataset.itemId = String(item.id);
      quantityGroup.append(decrease, quantity, increase);
      quantityColumn.appendChild(quantityGroup);

      const priceColumn = createElement('div', null, 'col-3');
      priceColumn.append(
        createElement('h3', 'Price:'),
        createElement('h4', formatMoney(item.price, item.currency)),
      );
      const remove = createElement('button', 'remove', 'btn btn-outline-primary remove');
      remove.type = 'button';
      remove.dataset.itemId = String(item.id);
      priceColumn.appendChild(remove);
      row.append(imageColumn, nameColumn, quantityColumn, priceColumn);
      card.appendChild(row);
      cartContainer.appendChild(card);
    }

    cartContainer.querySelectorAll('.remove').forEach((button) => {
      button.addEventListener('click', () => this.removeItem(button.dataset.itemId));
    });
    cartContainer.querySelectorAll('.increase').forEach((button) => {
      button.addEventListener('click', () => this.increaseQuantity(button.dataset.itemId));
    });
    cartContainer.querySelectorAll('.decrease').forEach((button) => {
      button.addEventListener('click', () => this.decreaseQuantity(button.dataset.itemId));
    });
    cartContainer.querySelectorAll('.quantity').forEach((input) => {
      input.addEventListener('change', () =>
        this.updateCartItemQuantity(input.dataset.itemId, input.value),
      );
    });
  }
}

if (globalThis.window && globalThis.localStorage) {
  new Cart();
}
