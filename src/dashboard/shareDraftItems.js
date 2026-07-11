const VITE_BASE_URL = import.meta.env?.BASE_URL ?? '/';

function textOrDefault(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function getEbayProductPath(itemId, baseUrl = VITE_BASE_URL) {
  const normalizedBase = textOrDefault(baseUrl, '/');
  const normalizedId = String(itemId).startsWith('fleek-') ? String(itemId) : `fleek-${itemId}`;
  const base = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`;
  return `${base}ebay/pages/ProductDetails.html?id=${encodeURIComponent(normalizedId)}`;
}

export async function shareMarketplaceItems({
  items,
  beginSharing = () => true,
  finishSharing = () => {},
  shareItems,
  markItemsPosted,
}) {
  const pending = items.filter((item) => !item.marketplace_posts?.ebay);
  if (pending.length === 0) return [];
  if (!beginSharing()) return [];

  try {
    await shareItems(pending);
    markItemsPosted(pending.map((item) => item.id));
    return pending;
  } finally {
    finishSharing();
  }
}
