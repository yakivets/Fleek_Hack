# Shared Contract

This is the only file both builders must agree on before splitting up. Once locked, it shouldn't change — if it must, change it together, not unilaterally, since both tracks depend on it.

## Listing object shape

Every item in the app, from capture through dashboard, is this shape:

```js
{
  id: string,              // crypto.randomUUID() at creation time
  images: string[],        // base64 data URIs, in capture order
  title: string,
  category: string,        // e.g. "Women's Jeans"
  brand: string | null,
  condition_grade: "A" | "B" | "C" | "D",
  defects: string[],       // short phrases, empty array if none
  description: string,
  suggested_price_gbp: number,
  price_reasoning: string,
  status: "draft" | "posted",
}
```

## Store API (`src/store.js`)

Zustand store, written once together, then frozen:

```js
import { create } from 'zustand';

export const useStore = create((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  updateItem: (id, patch) => set((s) => ({
    items: s.items.map(i => i.id === id ? { ...i, ...patch } : i)
  })),
}));
```

- Builder A calls `addItem()` once per successfully analyzed item (after n8n responds).
- Builder B's dashboard only ever reads `items` and calls `updateItem()` (for edits and for flipping `status` to `"posted"`).
- Neither builder edits `store.js` after the initial 15-minute sync unless a field needs to change — and if so, tell the other person before touching it.

## n8n webhook contract

**Request** (Builder A → n8n):
```json
POST <webhook-url>
Content-Type: application/json

{
  "images": ["data:image/jpeg;base64,...", "..."]
}
```
1–5 images per request, one request per item.

**Response** (n8n → Builder A):
```json
{
  "title": "string",
  "category": "string",
  "brand": "string | null",
  "condition_grade": "A|B|C|D",
  "defects": ["string", "..."],
  "description": "string",
  "suggested_price_gbp": 12.5,
  "price_reasoning": "string"
}
```
This is exactly the Listing shape minus `id`, `images`, and `status` — Builder A's `api.js` adds those three fields client-side before calling `addItem()`.

On failure (parse error, network error), the frontend should show a retry option rather than silently dropping the item — don't add elaborate error handling beyond that for the demo.

## Navigation (`src/App.jsx`)

Three client-side screens, kept in a single `useState` to avoid a router dependency:

```
Home    → HomeScreen
Scan    → CaptureScreen
Bundle  → DashboardScreen
```
