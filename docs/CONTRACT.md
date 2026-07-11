# Shared Contract

This is the only file both builders must agree on before splitting up. Once locked, it shouldn't change — if it must, change it together, not unilaterally, since both tracks depend on it.

## Listing object shape

Every item in the app, from capture through dashboard, is this shape:

```js
{
  id: string,              // crypto.randomUUID() at creation time
  images: string[],        // base64 data URIs, in capture order
  enhanced_images: (string | null)[], // AI studio edits, index-aligned with images
  enhancement_status: "idle" | "processing" | "ready" | "partial" | "failed",
  title: string,
  category: string,        // e.g. "Women's Jeans"
  brand: string | null,
  condition_grade: "A" | "B" | "C" | "D",
  defects: string[],       // short phrases, empty array if none
  description: string,
  suggested_price_gbp: number,
  price_reasoning: string,
  status: "draft" | "posted",
  category_key: string,     // normalized client-side grouping, e.g. "Jeans"
  bundle_id: string | null, // null for Single mode
  marketplace_posts: {
    vinted: boolean,
    ebay: boolean,
  },
}
```

`category_key` and `bundle_id` are added by the frontend. The n8n response contract remains unchanged.

## Bundle object shape

```js
{
  id: string,
  name: string,
  created_at: string, // ISO timestamp
  status: "active" | "finished" | "archived",
}
```

Bundle membership is derived from each listing's `bundle_id`; bundles do not store a duplicate item-ID array.

## Store API (`src/store.js`)

The Zustand store now owns:

- `items`, `bundles`, `activeBundleId`, `captureMode`, and global `marketplaceConnections`.
- `startBundle`, `continueBundle`, `finishBundle`, `archiveBundle`, and `renameBundle`.
- `addItem`, `updateItem`, and confirmed `removeItem`.
- `renameCategoryGroup` for moving every matching item without changing listing copy.
- `connectMarketplace`, `postItemToMarketplace`, and `postBundleToMarketplace`.

The persisted subset is stored in IndexedDB because base64 item photos can exceed localStorage limits. If IndexedDB is unavailable, the app remains usable with an in-memory fallback for that session.

`normalizeCategory()` maps variable AI labels into stable client-side groups. Editing a listing category recomputes its group unless the user explicitly moved it.

Marketplace connections and posts are client-side placeholders. They persist for the demo but do not authenticate with or send data to Vinted/eBay.

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
This is the AI portion of the Listing shape. The frontend adds `id`, `images`, `status`, `category_key`, and `bundle_id`.

On failure (parse error, network error), the frontend should show a retry option rather than silently dropping the item — don't add elaborate error handling beyond that for the demo.

## Image enhancement webhook

After a listing is saved, the frontend sends each captured photo independently:

```json
POST <enhance-url>
Content-Type: application/json

{ "image": "data:image/jpeg;base64,..." }
```

The n8n workflow returns the edited image as an `image/jpeg` binary response. The frontend stores it in the matching `enhanced_images` slot, updates the gallery as each photo completes, and keeps the original as a fallback when a request fails. The Production URL belongs in `VITE_N8N_ENHANCE_URL`.

## Navigation (`src/App.jsx`)

Three client-side screens, kept in a single `useState` to avoid a router dependency:

```
Home    → HomeScreen
Scan    → CaptureScreen
Library → DashboardScreen (All items | Bundles)
```
