const IMAGE_DATA_URL = /^data:image\/(?:avif|gif|jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i;

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function safelyParseBoolean(value) {
  try {
    return JSON.parse(value ?? 'false') === true;
  } catch {
    return false;
  }
}

export function safeImageUrl(value) {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url) return '';
  if (IMAGE_DATA_URL.test(url)) return url;

  try {
    const baseUrl = globalThis.document?.baseURI ?? 'https://example.invalid/';
    const parsed = new URL(url, baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function getProductImages(product = {}) {
  const candidates = Array.isArray(product.imageUrl)
    ? product.imageUrl
    : [product.image];
  return candidates.map(safeImageUrl).filter(Boolean);
}

export function formatMoney(value, currency = 'USD') {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedCurrency =
    typeof currency === 'string' && currency.toUpperCase() === 'GBP' ? 'GBP' : 'USD';

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: normalizedCurrency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
  }).format(safeAmount);
}

export function mergeProducts(seedProducts = [], sharedProducts = []) {
  const merged = new Map();
  for (const product of [...seedProducts, ...sharedProducts]) {
    if (!product || typeof product !== 'object' || product.id == null) continue;
    merged.set(String(product.id), product);
  }
  return [...merged.values()];
}

export function filterProductsByCategory(products, category) {
  if (!category || String(category).toLowerCase() === 'seeall') return [...products];
  const normalizedCategory = String(category).trim().toLowerCase();
  return products.filter(
    (product) =>
      typeof product.category === 'string' &&
      product.category.trim().toLowerCase() === normalizedCategory,
  );
}

export function productName(product = {}) {
  const value = product.name ?? product.title;
  return typeof value === 'string' && value.trim() ? value.trim() : 'Untitled item';
}

export async function sharedListingsOrEmpty(loadSharedListings, onError = () => {}) {
  try {
    const listings = await loadSharedListings();
    return Array.isArray(listings) ? listings : [];
  } catch (error) {
    onError(error);
    return [];
  }
}

export function loadCatalogSources(loadSeedProducts, loadSharedListings, onSharedError) {
  return Promise.all([
    loadSeedProducts(),
    sharedListingsOrEmpty(loadSharedListings, onSharedError),
  ]);
}

export function applyCatalogQuery(catalog, query = {}) {
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
  const filters = query.filters ?? {};
  let result = [...catalog];

  if (search) {
    result = result.filter((product) => productName(product).toLowerCase().includes(search));
  }
  if (filters.brand) result = result.filter((product) => product.brand === filters.brand);
  if (filters.color) result = result.filter((product) => product.color === filters.color);
  if (filters.condition) {
    result = result.filter((product) => product.condition === filters.condition);
  }
  if (filters.price) {
    result = result.filter((product) => {
      const price = Number(product.price);
      if (filters.price === 'under') return price < 110;
      if (filters.price === 'inBetween') return price >= 110 && price <= 180;
      return price > 180;
    });
  }
  if (filters.shipping) {
    result = result.filter((product) => {
      const shipping = Number(product.shipping) || 0;
      if (filters.shipping === '0') return shipping === 0;
      if (filters.shipping === '15') return shipping === 15;
      return shipping > 15;
    });
  }
  if (filters.sponsored) {
    result = result.filter((product) =>
      filters.sponsored === 'sponsored' ? product.isSponsored === true : !product.isSponsored,
    );
  }
  if (query.sort) {
    const direction = query.sort === 'Name (A-Z)' ? 1 : -1;
    result.sort((a, b) => direction * productName(a).localeCompare(productName(b)));
  }
  return result;
}
