# UI/UX — Implemented

The UI is built. This records the decisions as implemented; the full design system lives in `DESIGN.md` (and `PRODUCT.md` for strategy). The confirmed capture-screen design brief from `/impeccable shape` drove the capture flow.

## Screens

1. **Scan (capture)** — full-bleed camera viewfinder (the feed *is* the layout, no chrome boxing it in). Floating bottom overlay on an ink-tinted gradient: error banner (clay, with Retry) → thumbnail strip (tap a thumbnail's × to remove) → controls row (photo count `n/5`, circular shutter, moss "Analyze" pill once ≥1 photo). Analyzing freezes the viewfinder frame under a scrim with a pulsing "Analyzing…". Camera unavailable → automatic file-upload fallback screen with the same flow.
2. **Review (within Scan)** — crossfades in after analysis: photo strip up top, editable fields below (title, category, brand, condition A–D segmented control, price with £ prefix + price reasoning line, description, removable defect chips in clay), "Save & Next Item" (moss) + "Discard". Saving flashes a "Saved to bundle" pill and returns to the camera for the next item.
3. **Bundle (dashboard)** — Display-type header with bundle total £ and item count, status filter chips (All/Draft/Posted) + sort select (newest, price, condition, category), flat listing rows on stone-surface (thumbnail, title, condition letter badge, category, defect count in clay, price, status). "Post" flips a Draft to a moss "Posted" pill (mocked, client-side only). Tapping a row expands it inline into the shared `ListingEditor` — no modals anywhere. Empty state teaches ("Scan your first item…") with a button that jumps to the Scan tab.

## Decisions locked during implementation

- **Palette**: exactly as DESIGN.md — stone neutrals, Muted Moss as the sole interactive accent, Warm Clay only for defects/errors. One deviation: `--ink-muted` darkened from L 0.52 to 0.45 to clear WCAG AA 4.5:1 on Quiet Stone (noted in `src/styles.css`).
- **Type**: Satoshi via Fontshare CDN, weights 400/500/700, Inter/system-ui fallback.
- **Radii**: 12px controls/fields, 16px cards/rows.
- **Motion**: `settle-in` (thumbnails and dashboard rows arriving), crossfades between capture states, quiet pulse while analyzing. All disabled under `prefers-reduced-motion`.
- **Navigation**: two-tab bottom bar (Scan | Bundle) with an item-count badge, `useState` switch — no router dependency.
- **A11y**: condition grades always show the letter, status always shows the word, focus-visible moss outline globally, `role="status"`/`role="alert"` on transient messages, labeled form fields.

## Still open (revisit if time allows)

- [ ] Real-device pass: safe-area behavior on notched phones, shutter reachability
- [ ] Discard safety net (currently immediate, no confirm — intentional for speed)
- [ ] Add-defect input (chips are remove-only today)
- [ ] Dashboard grid option for larger bundles (list-only today)
