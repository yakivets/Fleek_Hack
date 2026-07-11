import { create } from 'zustand';

// Shared contract — see docs/CONTRACT.md. Don't edit unilaterally.
export const useStore = create((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  updateItem: (id, patch) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
}));
