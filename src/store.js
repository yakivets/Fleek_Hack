import { create } from 'zustand';

// Shared contract — see docs/CONTRACT.md. Don't edit unilaterally.
export const useStore = create((set, get) => ({
  items: [],
  isSharingToEbay: false,
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  updateItem: (id, patch) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  markItemsPosted: (ids) => {
    const postedIds = new Set(ids);
    if (postedIds.size === 0) return;

    set((s) => ({
      items: s.items.map((item) =>
        postedIds.has(item.id) ? { ...item, status: 'posted' } : item,
      ),
    }));
  },
  beginEbayShare: () => {
    if (get().isSharingToEbay) return false;
    set({ isSharingToEbay: true });
    return true;
  },
  finishEbayShare: () => {
    if (get().isSharingToEbay) set({ isSharingToEbay: false });
  },
}));
