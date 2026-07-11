const VITE_BASE_URL = import.meta.env?.BASE_URL ?? '/';

function textOrDefault(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function getEbaySellingPath(baseUrl = VITE_BASE_URL) {
  const normalizedBase = textOrDefault(baseUrl, '/');
  return `${normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`}ebay/pages/selling.html`;
}

export async function shareDraftItems({
  items,
  beginSharing = () => true,
  finishSharing = () => {},
  shareItems,
  markItemsPosted,
  onSuccess,
  navigate,
}) {
  const drafts = items.filter((item) => item.status === 'draft');
  if (drafts.length === 0) return [];
  if (!beginSharing()) return [];

  try {
    await shareItems(drafts);
    markItemsPosted(drafts.map((item) => item.id));
    onSuccess?.(drafts);
    navigate(getEbaySellingPath());

    return drafts;
  } finally {
    finishSharing();
  }
}
