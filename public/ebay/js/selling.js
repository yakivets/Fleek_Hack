import { getAllSharedListings } from './sharedListings.js';
import { formatMoney, getProductImages, productName } from './ebayCatalog.js';

function appendText(parent, tagName, text, className = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function displayValue(value, fallback = 'Not specified') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function createListing(listing) {
  const article = document.createElement('article');
  article.className = 'selling-item';
  const [imageSource] = getProductImages(listing);
  if (imageSource) {
    const image = document.createElement('img');
    image.src = imageSource;
    image.alt = productName(listing);
    article.appendChild(image);
  } else {
    appendText(article, 'div', 'No image', 'selling-image-placeholder');
  }

  const content = document.createElement('div');
  const title = document.createElement('h3');
  const link = document.createElement('a');
  link.href = `ProductDetails.html?id=${encodeURIComponent(String(listing.id))}`;
  link.textContent = productName(listing);
  title.appendChild(link);
  content.appendChild(title);

  const metadata = document.createElement('p');
  metadata.className = 'selling-meta';
  const status =
    listing.status ?? (listing.source === 'fleek' ? 'Active' : listing.sourceMetadata?.status);
  for (const value of [
    `Status: ${displayValue(status, 'Shared')}`,
    `Category: ${displayValue(listing.category)}`,
    `Condition: ${displayValue(listing.condition)}`,
  ]) {
    appendText(metadata, 'span', value);
  }
  content.appendChild(metadata);
  article.appendChild(content);
  appendText(
    article,
    'p',
    formatMoney(listing.price, listing.currency ?? 'GBP'),
    'selling-price',
  );
  return article;
}

async function init() {
  const state = document.getElementById('selling-state');
  const list = document.getElementById('selling-listings');
  const count = document.getElementById('listing-count');
  if (!state || !list || !count) return;

  try {
    const listings = await getAllSharedListings();
    count.textContent = `${listings.length} ${listings.length === 1 ? 'item' : 'items'}`;
    if (listings.length === 0) {
      state.textContent = 'No Fleek listings have been shared yet. Return to Fleek to share draft items.';
      return;
    }

    list.replaceChildren(...listings.map(createListing));
    list.hidden = false;
    state.hidden = true;
  } catch (error) {
    console.error('Error loading shared listings:', error);
    state.dataset.kind = 'error';
    state.textContent = 'Your Fleek listings could not be loaded from this browser. Please try again.';
  }
}

init();
