# Builder B — Dashboard + Backend

> **STATUS: complete and live-tested; bundle extension implemented.** The n8n workflow is live. The dashboard now includes All Items and Bundles views, grouped category sections, item moves, bundle/group renaming, lifecycle controls, totals, and IndexedDB persistence.

Owns: the n8n workflow, the dashboard screen, the mock "Post" action. Only touch files under `src/dashboard/` plus your one-time contribution to `src/App.jsx` and `src/store.js` during the initial sync.

Read `docs/CONTRACT.md` and `docs/BACKEND_N8N.md` first — the n8n spec is fully written out, build it exactly as documented rather than redesigning it.

## Functionality checklist

1. **Deploy the n8n workflow first** — import `docs/FLEEK_N8N_WORKFLOW.json` and follow `docs/BACKEND_N8N.md`. Test it standalone with a real image before the frontend depends on it.
2. **Dashboard screen** — reads `items` from the shared store (`useStore()`), renders as a vertical list of cards: thumbnail (first image), title, price, condition badge, status badge.
3. **Sort** — dropdown/buttons for sort by price, condition grade, category. Pure client-side array sort, no backend involved.
4. **Filter** — simple chips/toggles for category and/or price range. Also pure client-side.
5. **Marketplace placeholders** — opening an item or bundle shows Vinted and eBay controls. The first click stores a demo connection; the next marks that item or every item in the bundle as posted to the chosen marketplace. No real marketplace integration is performed.
6. **Tap a card** — re-opens it in an editable view (can reuse Builder A's listing-card edit component if it's ready, or build a minimal standalone edit form — coordinate this one specific handoff with Builder A rather than duplicating the component).
7. **AI studio photos** — after save, call the enhancement webhook once per captured image. Show completed edits incrementally, retain originals as fallbacks, and let the user switch between Studio and Original galleries.

## Files

```
src/dashboard/
  DashboardScreen.jsx  — top-level screen, reads store, renders list
  SortFilterBar.jsx     — sort/filter controls
  ListingCard.jsx        — card component (may be shared with Builder A's review screen — decide together if reused)
```

The live workflows run in n8n Cloud. Their importable definitions are committed as `docs/FLEEK_N8N_WORKFLOW.json` and `docs/FLEEK_N8N_ENHANCE_IMAGE_BRANCH.json`; the Production URLs belong in the ignored `.env.local` file as `VITE_N8N_WEBHOOK_URL` and `VITE_N8N_ENHANCE_URL`.

## Explicitly not your job

- Camera/capture UI — Builder A.
- Calling the OpenAI API directly from the frontend — never do this, it goes through n8n only (keeps the API key server-side).

## Notes

- Get the n8n workflow live and tested in the first hour — it's the single dependency Builder A is blocked on. Everything else on this list can happen after.
- The dashboard can and should be built and demoed with fake/hardcoded item data before real items exist from Builder A's flow — don't block your own progress waiting for integration.

## Delivered backend

The production path is:

```
Phone capture
  → n8n webhook
  → validate and prepare 1–5 images
  → one gpt-4o-mini vision request
  → parse and validate listing JSON
  → frontend review
  → Zustand dashboard
```

The OpenAI credential remains inside n8n. The workflow definition is available at `docs/FLEEK_N8N_WORKFLOW.json`, and `.env.example` documents frontend configuration. There is intentionally no database, authentication, or real marketplace API in this version.

After the user saves a listing, photo cleanup runs asynchronously so it does not delay the core capture loop. Each image is posted to the separate `enhance-image` workflow, which uses `gpt-image-1` edit mode to preserve the exact garment while replacing only its background, framing, and lighting. Completed edits are stored index-for-index beside the originals in IndexedDB and become the preferred marketplace/gallery images.

## Delivered extension — Bundles dashboard

### Navigation

Add a **Bundles** destination or dashboard tab alongside the existing item-level view. Keep the current dashboard available as **All Items** so users can still sort, edit, and post individual listings.

### Bundle presentation

Each bundle card should summarize:

- Bundle/session name and creation time.
- Total item count.
- Number of category groups.
- Draft versus posted count.
- Combined suggested resale value.
- Representative thumbnails.

Opening a bundle shows its items grouped by normalized category, for example:

```
Mixed Lot — 18 items
  Caps — 7
  Jeans — 6
  T-Shirts — 5
```

The group is based on each listing's normalized category rather than scan order. A jeans item scanned while working through caps therefore appears under Jeans automatically.

### Corrections and controls

- Move an item between category groups when AI classification is wrong.
- On touch devices, hold the item's grip and drag it directly onto another group.
- While dragging, reveal an explicit delete drop zone; require confirmation before removal.
- Rename a bundle or category group without changing the AI-generated listing title.
- Continue scanning into an unfinished bundle.
- Finish/archive a bundle without deleting its items.
- Continue editing and mock-posting individual listings from inside a bundle.

### State and persistence

The Zustand store includes bundle/session state and persists it to IndexedDB so a refresh does not erase a long scanning session. A real database is only needed when accounts, cross-device access, or production marketplace posting become requirements.

### Backend impact

The existing n8n workflow can remain unchanged because it already returns `category`. Category normalization can initially happen client-side. Only revise the AI prompt or response schema if testing shows inconsistent categories that cannot be normalized reliably.

### Acceptance criteria

1. ✅ Existing All Items behavior remains available.
2. ✅ Bundle cards display counts and total suggested value.
3. ✅ Items are grouped by normalized category, not capture order.
4. ✅ Moving an item updates its group and bundle totals immediately.
5. ✅ IndexedDB preserves active bundle sessions across refreshes.
6. ✅ Hold-and-drag moves items on mobile; destructive drops require confirmation.
7. ✅ Item and bundle views provide persisted Vinted/eBay connection and posting placeholders.
