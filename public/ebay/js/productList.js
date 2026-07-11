import { getAllSharedListings } from './sharedListings.js';
import {
  applyCatalogQuery,
  filterProductsByCategory,
  formatMoney,
  getProductImages,
  loadCatalogSources,
  mergeProducts,
  productName,
  safelyParseBoolean,
} from './ebayCatalog.js';

let catalog = [];
const catalogQuery = {
  search: '',
  filters: {},
  sort: '',
};

function appendText(parent, tagName, text, className = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function setSignedInGreeting() {
  if (!safelyParseBoolean(localStorage.getItem('isAuthenticated'))) return;
  const signButton = document.querySelector('.sign-btn');
  if (signButton) signButton.textContent = `Hi! ${localStorage.getItem('userName') ?? ''}`;
}

function productDetailHref(id) {
  return `../pages/ProductDetails.html?id=${encodeURIComponent(String(id))}`;
}

function createImage(product, className) {
  const image = document.createElement('img');
  image.className = className;
  image.alt = productName(product);
  const [source] = getProductImages(product);
  if (source) {
    image.src = source;
  } else {
    image.classList.add('product-image-missing');
    image.alt = `No image available for ${productName(product)}`;
  }
  return image;
}

function appendProductSummary(parent, product, horizontal = false) {
  const size = horizontal ? 'fs-5 fs-lg-4' : '';
  appendText(parent, 'h5', productName(product), `card-title ${size}`.trim());
  const details = document.createElement('div');
  details.className = 'card-text';
  appendText(
    details,
    'span',
    formatMoney(product.price, product.currency),
    horizontal ? 'fw-bold fs-6 fs-lg-5' : 'd-block mb-1 fw-bold',
  );

  const shipping = Number(product.shipping);
  appendText(
    details,
    'span',
    Number.isFinite(shipping) && shipping > 0
      ? `${formatMoney(shipping, product.currency)} shipping`
      : 'Free shipping',
    horizontal ? 'text-muted d-block small' : 'd-block mb-1 text-muted',
  );
  appendText(
    details,
    'span',
    `${Number(product.watching) || 0} watching`,
    horizontal ? 'text-danger d-block small' : 'd-block mb-1 text-danger',
  );
  if (product.isSponsored) {
    appendText(details, 'p', 'SPONSORED', 'mt-2 mb-0 text-muted small');
  }
  parent.appendChild(details);
}

function createProductElement(product) {
  const column = document.createElement('div');
  column.className = 'col';
  column.id = String(product.id);

  const link = document.createElement('a');
  link.className = 'text-decoration-none text-reset';
  link.href = productDetailHref(product.id);
  const article = document.createElement('article');
  article.className = 'card h-100';
  article.appendChild(createImage(product, 'card-img-top img-thumbnail verticalImg'));
  const body = document.createElement('div');
  body.className = 'card-body';
  appendProductSummary(body, product);
  article.appendChild(body);
  link.appendChild(article);
  column.appendChild(link);
  return column;
}

function createHorizontalProduct(product) {
  const card = document.createElement('div');
  card.className = 'card my-4';
  card.id = `horizontal-${String(product.id)}`;
  const link = document.createElement('a');
  link.className = 'text-decoration-none text-reset';
  link.href = productDetailHref(product.id);
  const row = document.createElement('div');
  row.className = 'row g-0';
  const imageColumn = document.createElement('div');
  imageColumn.className = 'col-4';
  imageColumn.appendChild(createImage(product, 'img-fluid rounded-start'));
  const contentColumn = document.createElement('div');
  contentColumn.className = 'col-8';
  const body = document.createElement('div');
  body.className = 'card-body';
  appendProductSummary(body, product, true);
  contentColumn.appendChild(body);
  row.append(imageColumn, contentColumn);
  link.appendChild(row);
  card.appendChild(link);
  return card;
}

function renderProducts(list = applyCatalogQuery(catalog, catalogQuery)) {
  const grid = document.querySelector('.productsContainer');
  const horizontal = document.querySelector('.horizontalContainer');
  if (!grid || !horizontal) return;
  grid.replaceChildren();
  horizontal.replaceChildren();

  if (list.length === 0) {
    appendText(grid, 'h2', 'No products found.', 'text-center w-100');
    return;
  }
  for (const product of list) {
    grid.appendChild(createProductElement(product));
    horizontal.appendChild(createHorizontalProduct(product));
  }
}

function createFilterElement(item, type) {
  const listItem = document.createElement('li');
  const anchor = document.createElement('a');
  anchor.className = 'dropdown-item';
  anchor.href = '#';
  const check = document.createElement('div');
  check.className = 'form-check';
  const input = document.createElement('input');
  input.className = 'form-check-input';
  input.type = 'radio';
  input.name = type;
  input.value = item;
  input.id = `${type}-${item.replace(/[^a-z0-9_-]/gi, '-')}`;
  const label = document.createElement('label');
  label.className = 'form-check-label';
  label.htmlFor = input.id;

  if (type === 'color') {
    const swatch = document.createElement('span');
    swatch.className = 'rounded-circle d-inline-block colorOptions';
    swatch.style.backgroundColor = item;
    label.appendChild(swatch);
    label.append(` ${item}`);
  } else {
    label.textContent = item;
  }
  check.append(input, label);
  anchor.appendChild(check);
  listItem.appendChild(anchor);
  return listItem;
}

function renderFilterData() {
  const definitions = [
    ['brand', '.brand ul'],
    ['condition', '.condition ul'],
    ['color', '.color ul'],
  ];
  for (const [field, selector] of definitions) {
    const container = document.querySelector(selector);
    if (!container) continue;
    container.replaceChildren();
    const values = new Set(
      catalog
        .map((product) => product[field])
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim()),
    );
    for (const value of values) container.appendChild(createFilterElement(value, field));
  }
}

function bindFilter(id, filterName) {
  document.querySelectorAll(`#${id} input`).forEach((input) => {
    input.addEventListener('change', () => {
      catalogQuery.filters[filterName] = input.value;
      renderProducts();
    });
  });
}

function bindControls() {
  bindFilter('brandFilter', 'brand');
  bindFilter('colorFilter', 'color');
  bindFilter('conditionFilter', 'condition');
  bindFilter('priceFilter', 'price');
  bindFilter('shippingFilter', 'shipping');
  bindFilter('sponsoredFilter', 'sponsored');
  document.querySelectorAll('#sortFilter input').forEach((input) => {
    input.addEventListener('change', () => {
      catalogQuery.sort = input.value;
      renderProducts();
    });
  });

  document.querySelectorAll('#viewFilter input').forEach((input) => {
    input.addEventListener('change', () => {
      const gridView = input.value === 'grid';
      document.querySelector('.productsContainer')?.classList.toggle('d-none', !gridView);
      document.querySelector('.horizontalContainer')?.classList.toggle('d-none', gridView);
    });
  });

  document.querySelector('.clearBtn button')?.addEventListener('click', () => {
    catalogQuery.search = '';
    catalogQuery.sort = '';
    catalogQuery.filters = {};
    document.querySelectorAll('.filter-section input').forEach((input) => {
      input.checked = false;
    });
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    document.querySelector('.productsContainer')?.classList.remove('d-none');
    document.querySelector('.horizontalContainer')?.classList.add('d-none');
    renderProducts();
  });

  document.getElementById('searchInput')?.addEventListener('input', (event) => {
    catalogQuery.search = event.target.value;
    renderProducts();
  });
}

async function init() {
  setSignedInGreeting();
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
    const category = new URLSearchParams(window.location.search).get('category');
    catalog = filterProductsByCategory(
      mergeProducts(seedProducts, sharedProducts),
      category,
    );
    renderFilterData();
    bindControls();
    renderProducts();
  } catch (error) {
    console.error('Error fetching products:', error);
    const grid = document.querySelector('.productsContainer');
    if (grid) {
      grid.replaceChildren();
      appendText(grid, 'p', 'Products could not be loaded. Please try again.', 'alert alert-danger');
    }
  }
}

init();
