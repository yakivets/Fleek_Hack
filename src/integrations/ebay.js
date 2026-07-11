import * as bundledSharedListingsStorage from './sharedListings.js';

const CONDITION_LABELS = {
  A: 'Excellent condition',
  B: 'Good condition',
  C: 'Fair condition',
  D: 'Well worn',
};

const VITE_BASE_URL = import.meta.env?.BASE_URL ?? '/';

function textOrDefault(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizedStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getSharedListingsModuleUrl(baseUrl = VITE_BASE_URL) {
  const normalizedBase = textOrDefault(baseUrl, '/');
  return `${normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`}ebay/js/sharedListings.js`;
}

export async function loadSharedListingsStorage() {
  return bundledSharedListingsStorage;
}

export function mapFleekItemToEbayProduct(item) {
  if (!item || typeof item !== 'object') {
    throw new TypeError('Fleek item must be an object');
  }

  const sourceId = textOrDefault(item.id, '');
  if (!sourceId) {
    throw new TypeError('Fleek item must have a non-empty id');
  }

  const id = sourceId.startsWith('fleek-') ? sourceId : `fleek-${sourceId}`;
  const title = textOrDefault(item.title, 'Untitled item');
  const images = normalizedStringArray(item.images);
  const numericPrice = Number(item.suggested_price_gbp);
  const price = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
  const conditionGrade =
    typeof item.condition_grade === 'string' ? item.condition_grade.toUpperCase() : '';

  return {
    id,
    name: title,
    title,
    category: textOrDefault(item.category, 'Other'),
    brand: textOrDefault(item.brand, 'Unbranded'),
    price,
    currency: 'GBP',
    condition: CONDITION_LABELS[conditionGrade] ?? 'Pre-owned',
    details: typeof item.description === 'string' ? item.description : '',
    imageUrl: images,
    image: images[0] ?? '',
    shipping: 0,
    watching: 0,
    isSponsored: false,
    quantity: 1,
    source: 'fleek',
    sourceMetadata: {
      id: sourceId,
      conditionGrade: conditionGrade || null,
      defects: normalizedStringArray(item.defects),
      priceReasoning:
        typeof item.price_reasoning === 'string' ? item.price_reasoning : '',
      status: typeof item.status === 'string' ? item.status : null,
    },
  };
}

export async function shareFleekItemsToEbay(items, storage) {
  if (!Array.isArray(items)) {
    throw new TypeError('Fleek items must be an array');
  }

  const products = items.map(mapFleekItemToEbayProduct);
  if (products.length === 0) return [];

  const sharedListingsStorage = storage ?? (await loadSharedListingsStorage());
  if (typeof sharedListingsStorage?.upsertSharedListings !== 'function') {
    throw new TypeError('Shared listings storage must provide upsertSharedListings');
  }

  await sharedListingsStorage.upsertSharedListings(products);
  return products;
}
