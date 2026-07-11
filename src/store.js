import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { indexedDbStorage } from './storage.js';

const CATEGORY_RULES = [
  [/\b(cap|caps|hat|hats|beanie|beanies|headwear)\b/i, 'Caps & hats'],
  [/\b(jean|jeans|denim trouser|denim trousers)\b/i, 'Jeans'],
  [/\b(t-?shirt|t-?shirts|tee|tees)\b/i, 'T-Shirts'],
  [/\b(shirt|shirts|blouse|blouses)\b/i, 'Shirts'],
  [/\b(jacket|jackets|coat|coats|outerwear)\b/i, 'Jackets & coats'],
  [/\b(jumper|jumpers|sweater|sweaters|cardigan|cardigans|knitwear)\b/i, 'Knitwear'],
  [/\b(trouser|trousers|pants|chino|chinos)\b/i, 'Trousers'],
  [/\b(short|shorts)\b/i, 'Shorts'],
  [/\b(skirt|skirts)\b/i, 'Skirts'],
  [/\b(dress|dresses)\b/i, 'Dresses'],
  [/\b(hoodie|hoodies|sweatshirt|sweatshirts)\b/i, 'Sweatshirts & hoodies'],
  [/\b(track|sportswear|activewear|jersey|jerseys)\b/i, 'Sportswear'],
  [/\b(shoe|shoes|trainer|trainers|sneaker|sneakers|boot|boots)\b/i, 'Shoes'],
  [/\b(bag|bags|handbag|handbags|backpack|backpacks)\b/i, 'Bags'],
  [/\b(belt|belts|scarf|scarves|accessory|accessories)\b/i, 'Accessories'],
];

export const DEFAULT_CATEGORY_GROUPS = CATEGORY_RULES.map(([, label]) => label);
export const MARKETPLACES = ['vinted', 'ebay'];

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeCategory(category) {
  const value = String(category || '').trim();
  if (!value) return 'Other';

  const match = CATEGORY_RULES.find(([pattern]) => pattern.test(value));
  if (match) return match[1];

  const cleaned = value
    .replace(/\b(men'?s|women'?s|unisex|boys?|girls?|kids?|vintage)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,/&-]+|[\s,/&-]+$/g, '')
    .trim();

  return cleaned ? titleCase(cleaned) : 'Other';
}

function withCategoryKey(item) {
  return {
    ...item,
    category_key: item.category_key || normalizeCategory(item.category),
    bundle_id: item.bundle_id || null,
    enhanced_images: Array.isArray(item.enhanced_images) ? item.enhanced_images : [],
    enhancement_status: item.enhancement_status || 'idle',
    marketplace_posts: {
      vinted: false,
      ebay: false,
      ...item.marketplace_posts,
    },
  };
}

export const useStore = create(
  persist(
    (set, get) => ({
      items: [],
      bundles: [],
      activeBundleId: null,
      captureMode: 'single',
      marketplaceConnections: { vinted: false, ebay: false },
      hasHydrated: false,

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setCaptureMode: (captureMode) => set({ captureMode }),
      setActiveBundle: (activeBundleId) => set({ activeBundleId }),

      startBundle: (name) => {
        const bundle = {
          id: crypto.randomUUID(),
          name: name?.trim() || `Bundle ${get().bundles.length + 1}`,
          created_at: new Date().toISOString(),
          status: 'active',
        };
        set((state) => ({
          bundles: [...state.bundles, bundle],
          activeBundleId: bundle.id,
          captureMode: 'bundle',
        }));
        return bundle.id;
      },

      renameBundle: (id, name) =>
        set((state) => ({
          bundles: state.bundles.map((bundle) =>
            bundle.id === id && name.trim() ? { ...bundle, name: name.trim() } : bundle,
          ),
        })),

      finishBundle: (id) =>
        set((state) => ({
          bundles: state.bundles.map((bundle) =>
            bundle.id === id ? { ...bundle, status: 'finished' } : bundle,
          ),
          activeBundleId: state.activeBundleId === id ? null : state.activeBundleId,
          captureMode: state.activeBundleId === id ? 'single' : state.captureMode,
        })),

      archiveBundle: (id) =>
        set((state) => ({
          bundles: state.bundles.map((bundle) =>
            bundle.id === id ? { ...bundle, status: 'archived' } : bundle,
          ),
          activeBundleId: state.activeBundleId === id ? null : state.activeBundleId,
          captureMode: state.activeBundleId === id ? 'single' : state.captureMode,
        })),

      continueBundle: (id) =>
        set((state) => ({
          bundles: state.bundles.map((bundle) =>
            bundle.id === id ? { ...bundle, status: 'active' } : bundle,
          ),
          activeBundleId: id,
          captureMode: 'bundle',
        })),

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, withCategoryKey(item)],
        })),

      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...patch };
            if (
              'category' in patch
              && patch.category !== item.category
              && (!('category_key' in patch) || patch.category_key === item.category_key)
            ) {
              next.category_key = normalizeCategory(patch.category);
            }
            return next;
          }),
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      connectMarketplace: (marketplace) => {
        if (!MARKETPLACES.includes(marketplace)) return;
        set((state) => ({
          marketplaceConnections: {
            ...state.marketplaceConnections,
            [marketplace]: true,
          },
        }));
      },

      postItemToMarketplace: (id, marketplace) => {
        if (!MARKETPLACES.includes(marketplace)) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  marketplace_posts: {
                    ...item.marketplace_posts,
                    [marketplace]: true,
                  },
                  status: 'posted',
                }
              : item,
          ),
        }));
      },

      postBundleToMarketplace: (bundleId, marketplace) => {
        if (!MARKETPLACES.includes(marketplace)) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.bundle_id === bundleId
              ? {
                  ...item,
                  marketplace_posts: {
                    ...item.marketplace_posts,
                    [marketplace]: true,
                  },
                  status: 'posted',
                }
              : item,
          ),
        }));
      },

      renameCategoryGroup: (bundleId, from, to) => {
        const name = to.trim();
        if (!name) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.bundle_id === bundleId && item.category_key === from
              ? { ...item, category_key: name }
              : item,
          ),
        }));
      },
    }),
    {
      name: 'fleek-relist',
      version: 1,
      storage: createJSONStorage(() => indexedDbStorage),
      partialize: ({
        items,
        bundles,
        activeBundleId,
        captureMode,
        marketplaceConnections,
      }) => ({
        items,
        bundles,
        activeBundleId,
        captureMode,
        marketplaceConnections,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        items: (persisted?.items || []).map(withCategoryKey),
        bundles: persisted?.bundles || [],
        marketplaceConnections: {
          ...current.marketplaceConnections,
          ...persisted?.marketplaceConnections,
        },
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
