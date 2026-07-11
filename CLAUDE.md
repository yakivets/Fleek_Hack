# Fleek Hack — Project Context

Hackathon project for the Fleek x a16z one-day hackathon (Vision track, with Agents/LLM and Circular Moonshot elements). Team of 2, ~7 build hours, mobile-first PWA.

## What this is

Fleek is a **B2B wholesale** marketplace: suppliers sell bulk bundles (10+ unsorted secondhand garments) to resellers via "Virtual Handpick" and their internal Fleek Sort VLM. Fleek's involvement ends at delivery — resellers receive a box and are on their own to sort, grade, price, and relist each item individually on eBay/Vinted/Depop.

**Our product** is the layer that starts *after* that handoff: a reseller opens the app, rapid-captures photos of each item in their bundle, and an AI pipeline turns the pile into individual, ready-to-post listings with condition grading, defect notes, and price suggestions — sorted into a dashboard.

Do not build anything that duplicates Fleek's own wholesale-intake tooling (Fleek Sort). This product operates one step downstream of it.

## Decided architecture

- **Frontend:** Vite + React, plain JS (no TypeScript), Tailwind via CDN `<script>` (no build config), Zustand for state.
- **Backend:** n8n (cloud, not self-hosted — need a public webhook URL reachable from a phone on venue wifi with zero networking setup). One workflow. No database — the item list lives in the frontend's Zustand store for the demo.
- **AI:** OpenAI `gpt-4o-mini` for vision (image → listing JSON in one call: title, category, condition, defects, price, reasoning). Cheap enough that budget is a non-issue (~$2-9 for the whole event even under generous use).
- **Capture mode:** rapid tap-to-capture screenshots (canvas grab from a live `getUserMedia` video element), not continuous video/live-streaming. Live-streaming and auto item-boundary detection are explicitly deferred — see Priorities below.
- **"Post to eBay/Vinted":** hardcoded/mocked. Flips a status badge client-side. No real marketplace integration.

## Status: full UI, backend, and bundle workflow live

The complete UI is implemented and building (`npm run build` passes). The n8n workflow has been deployed, connected through `VITE_N8N_WEBHOOK_URL`, and successfully tested end-to-end from a phone. Single and Bundle capture modes are implemented; bundle sessions automatically group mixed garments, persist to IndexedDB, and appear in the Bundles dashboard. The empty webhook setting still enables the built-in mock backend for UI-only development.

Run: `npm install`, then `npm run dev`. Served over HTTPS (self-signed, via `@vitejs/plugin-basic-ssl`) so a phone on the same wifi can open the Network URL and use its camera — accept the cert warning once. Camera-denied/desktop-without-webcam falls back to a file-upload flow automatically.

## Repo layout (actual)

```
index.html          — Tailwind CDN + Satoshi (Fontshare) + theme config
vite.config.js      — react + basic-ssl (camera needs a secure context on phones)
src/
  main.jsx
  styles.css        — OKLCH design tokens from DESIGN.md, animations, reduced-motion
  App.jsx           — screen switch (Scan | Bundle) + bottom nav with item-count badge
  store.js          — shared Zustand store (contract in docs/CONTRACT.md — don't edit unilaterally)
  capture/          — Builder A's folder
    CaptureScreen.jsx  — camera / analyzing / review states + camera-unavailable fallback
    useCamera.js       — getUserMedia hook, frame grab (1024px cap), file→dataURI fallback
    api.js             — analyzeItem(): mock behind empty WEBHOOK_URL, real fetch when set
    ListingEditor.jsx  — shared editable listing form (also used by dashboard inline edit)
  dashboard/        — Builder B's folder
    DashboardScreen.jsx — header totals, sort + status filter, rows, Post, inline edit, empty state
```

## Design Context

`PRODUCT.md` and `DESIGN.md` now exist at the project root — read them before building any UI. Short version: product register, calm/considered/premium personality, natural neutral palette (moss + clay accent on stone neutrals, no cream/sand tones), single warm humanist sans typeface, restrained/responsive motion. Full DESIGN.md is a `<!-- SEED -->` — re-run `/impeccable document` once the capture/dashboard screens exist to capture real component tokens.

## Docs

- `docs/CONTRACT.md` — the shared interfaces both builders code against (listing schema, store API, webhook request/response shape). Read this first, it's the only thing that must not drift between the two tracks.
- `docs/BACKEND_N8N.md` — full n8n workflow spec: nodes, exact system prompt, JSON schema, parsing code, CORS gotcha.
- `docs/PLAN_BUILDER_A.md` — capture flow build plan.
- `docs/PLAN_BUILDER_B.md` — dashboard + n8n backend build plan.
- `docs/UI_UX.md` — placeholder, screens/flow to be filled in by the user later. Don't invent detailed visual design ahead of that.

## Priorities (cut from the bottom if behind schedule)

1. Capture → n8n → listing card (core loop, both tracks meet here)
2. Dashboard rendering the item list
3. Sort/filter on dashboard
4. Inline edit on listing card
5. "Post" mock button
6. Live-streaming capture / auto item-boundary detection — stretch only, cut first

## Delivered bundle extension

The app includes a **Single / Bundle** capture choice. Single preserves the original flow. Bundle mode keeps a multi-item scanning session open and automatically groups mixed garments by normalized AI category. The Bundles dashboard provides grouped items, counts, combined suggested value, hold-and-drag correction, confirmed deletion, renaming, lifecycle actions, and browser persistence. See `docs/PLAN_BUILDER_A.md`, `docs/PLAN_BUILDER_B.md`, and `docs/CONTRACT.md`.

## Timeline (7 hrs)

| Time | What |
|---|---|
| 0:00–0:20 | Together: contract, repo skeleton, n8n workflow skeleton |
| 0:20–3:00 | Parallel build |
| 3:00–3:30 | Merge checkpoint 1 — wire real n8n → store → dashboard |
| 3:30–5:30 | Parallel polish |
| 5:30–6:00 | Merge checkpoint 2 — full run-through |
| 6:00–7:00 | Bug fixes, demo script, rehearse |
