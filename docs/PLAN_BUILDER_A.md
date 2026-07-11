# Builder A — Capture Flow

> **STATUS: complete and live-tested.** The capture flow is implemented, connected to the production n8n webhook through `VITE_N8N_WEBHOOK_URL`, and successfully tested on a phone. Extra beyond the original plan: file-upload fallback when camera is unavailable, saved-confirmation flash, photo removal on thumbnail tap, and environment-based mock/live backend switching.

Owns: camera access, rapid tap-to-capture UI, calling the n8n webhook, the listing-review/edit screen. Only touch files under `src/capture/` plus your one-time contribution to `src/App.jsx` and `src/store.js` during the initial sync.

Read `docs/CONTRACT.md` first — it's the interface you build against.

## Functionality checklist

1. **Camera view** — `getUserMedia({video: {facingMode: 'environment'}})` into a `<video>` element, full-bleed on the capture screen.
2. **Rapid tap-to-capture** — shutter button draws the current video frame to an offscreen `<canvas>`, exports as base64 JPEG (`canvas.toDataURL('image/jpeg', 0.8)` — quality 0.8 keeps payload size reasonable), appends to a local array of captured images for the current item. Show a horizontal thumbnail strip of what's captured so far.
3. **"Analyze Item" button** — enabled once ≥1 photo captured. On tap: POST `{ images: [...] }` to the n8n webhook URL (see contract), show a loading state.
4. **On response:**
   - Success → build the full Listing object (`id: crypto.randomUUID()`, spread the n8n response, `status: "draft"`, `images` from your local capture buffer) → `addItem()` into the store → show the listing card with editable fields (title, price, condition, description — inline text inputs, no need for a separate edit mode).
   - Failure (network error or `{error: "parse_failed"}`) → show a simple "Analysis failed, retry?" state with a retry button that re-sends the same images. Don't build more error handling than this.
5. **"Save & Next Item"** — clears the capture buffer, returns to the camera view for the next item.
6. **"Discard"** — clears the capture buffer without saving, returns to camera view.

## Files

```
src/capture/
  CaptureScreen.jsx   — top-level screen, owns capture buffer state + screen mode (camera | loading | review)
  useCamera.js         — getUserMedia setup/teardown hook
  api.js                — the fetch() call to the n8n webhook
```

## Explicitly not your job

- Dashboard rendering, sort/filter — Builder B.
- The n8n workflow itself — Builder B builds and tests it; you just need the webhook URL and the contract shape.
- Live video streaming / continuous analysis — deferred, not in scope for the 7-hour build.

## Notes

- Test your capture → webhook flow against Builder B's n8n workflow as soon as it's live (should be well before the 3:00 merge checkpoint) — don't wait until the checkpoint to send a real request for the first time.
- Keep captured images at reasonable resolution before encoding (e.g. cap canvas width at ~1024px) — full camera resolution photos make for slow uploads on venue wifi and bigger OpenAI payloads for no quality benefit at this task.

## Future plan — Single and Bundle capture modes

Do not implement this during the current hackathon pass. The existing single-item flow remains the default and must not regress.

### Entry point

Add a mode choice before or at the top of the camera:

- **Single** — current behavior: photograph one item, analyze it, review it, and save it as a standalone listing.
- **Bundle** — starts a multi-item scanning session. After each analyzed item, the camera immediately resets for the next garment while keeping the session active.

### Automatic bundle sorting

In Bundle mode, the AI response already supplies `category`. Normalize that value into a stable grouping key such as `Caps`, `Jeans`, `T-Shirts`, or `Jackets`. Every scanned item is automatically placed into the matching category group, regardless of the order in which it was scanned.

Example: while scanning a mixed caps-and-jeans lot, a pair of jeans captured between caps is routed to the Jeans group instead of remaining in the Caps group.

### Required capture UX

- Show the active mode and current session item count.
- After saving an item, briefly confirm its destination group: “Added to Jeans.”
- Keep **Finish Bundle** visible while the session is active.
- Let the reseller correct classification before saving or move an item later from the dashboard.
- Preserve captured work if the user moves between Capture and Dashboard during the session.

### Deferred data proposal

Do not change `docs/CONTRACT.md` until implementation begins. The likely additions are:

- A bundle/session object with `id`, `name`, `created_at`, and item IDs.
- A stable `category_key` on each listing for grouping.
- Optional `bundle_id` on each listing.

Prefer deriving category groups from listings instead of storing duplicate item arrays unless persistence requirements make that necessary.

### Acceptance criteria

1. Single mode behaves exactly as it does now.
2. Bundle mode supports repeated capture without ending the session after each item.
3. Mixed scan order produces correct category groups.
4. The user can correct or move a misclassified item.
5. Finishing a bundle opens its grouped dashboard view.
