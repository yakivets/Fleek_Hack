import { Cart, addItemAndNavigate } from './cart.js';
import { getAllSharedListings } from './sharedListings.js';
import {
  formatMoney,
  getProductImages,
  loadCatalogSources,
  mergeProducts,
  productName,
  safelyParseBoolean,
} from './ebayCatalog.js';

function appendText(parent, tagName, text, className = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function showMessage(message, isError = false) {
  const details = document.getElementById('productDetails');
  const sideImages = document.querySelector('.side-images');
  const carousel = document.querySelector('.carousel-inner');
  sideImages?.replaceChildren();
  carousel?.replaceChildren();
  if (!details) return;
  details.replaceChildren();
  appendText(details, 'p', message, isError ? 'alert alert-danger' : 'alert alert-info');
}

function renderImages(product) {
  const images = getProductImages(product);
  const sideImages = document.querySelector('.side-images');
  const carousel = document.querySelector('.carousel-inner');
  sideImages?.replaceChildren();
  carousel?.replaceChildren();

  if (images.length === 0) {
    if (carousel) appendText(carousel, 'p', 'No image available.', 'alert alert-light text-center');
    return;
  }

  images.forEach((source, index) => {
    const sideImage = document.createElement('img');
    sideImage.className = 'img-side';
    sideImage.src = source;
    sideImage.alt = `${productName(product)} photo ${index + 1}`;
    sideImage.addEventListener('click', () => {
      const mainImage = document.querySelector('.carousel-item.active .img-main');
      if (mainImage) mainImage.src = source;
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'inner mb-3';
    wrapper.appendChild(sideImage);
    sideImages?.appendChild(wrapper);

    const slide = document.createElement('div');
    slide.className = `carousel-item${index === 0 ? ' active' : ''}`;
    const mainImage = document.createElement('img');
    mainImage.className = 'd-block w-100 img-main';
    mainImage.src = source;
    mainImage.alt = `${productName(product)} photo ${index + 1}`;
    slide.appendChild(mainImage);
    carousel?.appendChild(slide);
  });
}

function addToWatchlist(product) {
  let watchlist = [];
  try {
    const stored = JSON.parse(localStorage.getItem('watchlist') ?? '[]');
    if (Array.isArray(stored)) watchlist = stored;
  } catch {
    // Replace malformed local data with a valid watchlist.
  }
  if (watchlist.some((item) => String(item.id) === String(product.id))) return;
  watchlist.push(product);
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

function renderDetails(product, cart) {
  const container = document.getElementById('productDetails');
  if (!container) return;
  container.replaceChildren();

  appendText(container, 'h1', productName(product), 'fs-2 text-center');
  appendText(
    container,
    'p',
    typeof product.details === 'string' ? product.details : '',
    'fs-5',
  );

  const facts = document.createElement('div');
  appendText(
    facts,
    'p',
    `${Number(product.watching) || 0} watching`,
    'text-danger fs-5 fw-bold',
  );
  appendText(
    facts,
    'p',
    Number(product.shipping) > 0
      ? `${formatMoney(product.shipping, product.currency)} shipping`
      : 'Free shipping',
    'text-success',
  );
  container.appendChild(facts);

  const priceSection = document.createElement('div');
  priceSection.className = 'price-section';
  appendText(
    priceSection,
    'p',
    `${formatMoney(product.price, product.currency)}/ea`,
    'price fs-3 fw-bold mt-2',
  );
  appendText(
    priceSection,
    'p',
    `Condition: ${
      typeof product.condition === 'string' && product.condition.trim()
        ? product.condition
        : 'Not specified'
    }`,
    'pt-2 fs-6 fw-bolder',
  );
  const quantityBox = document.createElement('div');
  quantityBox.className = 'quantity-box';
  const quantityLabel = document.createElement('label');
  quantityLabel.htmlFor = 'quantity';
  quantityLabel.textContent = 'Quantity:';
  const quantity = document.createElement('input');
  quantity.className = 'input-box';
  quantity.type = 'number';
  quantity.id = 'quantity';
  quantity.name = 'quantity';
  quantity.value = '1';
  quantity.min = '1';
  quantityBox.append(quantityLabel, quantity);
  priceSection.appendChild(quantityBox);
  container.appendChild(priceSection);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const buyLink = document.createElement('a');
  buyLink.href = './login.html';
  const buyButton = document.createElement('button');
  buyButton.className = 'btn btn-primary active my-2 p-5 rounded-pill py-2';
  buyButton.type = 'button';
  buyButton.textContent = 'Buy It Now';
  buyLink.appendChild(buyButton);

  const cartButton = document.createElement('button');
  cartButton.id = 'add-to-cart';
  cartButton.className = 'btn btn-primary my-2 rounded-pill py-2';
  cartButton.type = 'button';
  cartButton.textContent = 'Add to cart';
  cartButton.addEventListener('click', (event) => {
    event.preventDefault();
    try {
      addItemAndNavigate(cart, storageProduct, () => {
        window.location.href = './CartPage.html';
      }, quantity.value);
    } catch (error) {
      console.error('Unable to save cart item:', error);
      cartButton.textContent = 'Could not add to cart';
    }
  });

  const watchButton = document.createElement('button');
  watchButton.id = 'addToWatchlistBtn';
  watchButton.className = 'btn btn-outline-primary p-5 rounded-pill py-2';
  watchButton.type = 'button';
  watchButton.textContent = '♡ Add to watchlist';
  const storageProduct = {
    ...product,
    name: productName(product),
    title: productName(product),
    category: product.category ?? 'Other',
    condition: product.condition ?? 'Not specified',
    price: Number.isFinite(Number(product.price)) ? Number(product.price) : 0,
    currency:
      typeof product.currency === 'string' && product.currency.toUpperCase() === 'GBP'
        ? 'GBP'
        : 'USD',
    discountPercentage: Number.isFinite(Number(product.discountPercentage))
      ? Number(product.discountPercentage)
      : 0,
    shippingPrice: Number.isFinite(Number(product.shippingPrice))
      ? Number(product.shippingPrice)
      : 0,
    seller: product.seller ?? 'Fleek seller',
    sellerFeedback: product.sellerFeedback ?? '',
    imageUrl: getProductImages(product),
    image: getProductImages(product)[0] ?? '',
  };
  watchButton.addEventListener('click', () => addToWatchlist(storageProduct));
  actions.append(buyLink, cartButton, watchButton);
  container.appendChild(actions);
}

function setSignedInGreeting() {
  if (!safelyParseBoolean(localStorage.getItem('isAuthenticated'))) return;
  const signButton = document.querySelector('.sign-btn');
  if (signButton) signButton.textContent = `Hi! ${localStorage.getItem('userName') ?? ''}`;
}

async function init() {
  setSignedInGreeting();
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    showMessage('No product was selected.', true);
    return;
  }

  showMessage('Loading product…');
  try {
    const [seedProducts, sharedProducts] = await loadCatalogSources(
      async () => {
        const response = await fetch('../data.json');
        if (!response.ok) throw new Error(`Product data request failed (${response.status})`);
        const seedData = await response.json();
        return seedData.products ?? [];
      },
      getAllSharedListings,
      (error) =>
        console.warn('Shared listings are unavailable:', error),
    );
    const product = mergeProducts(seedProducts, sharedProducts).find(
      (candidate) => String(candidate.id) === id,
    );
    if (!product) {
      showMessage('This product could not be found.', true);
      return;
    }
    renderImages(product);
    renderDetails(product, new Cart());
  } catch (error) {
    console.error('Error loading product:', error);
    showMessage('This product could not be loaded. Please try again.', true);
  }
}

document.addEventListener('DOMContentLoaded', init);
