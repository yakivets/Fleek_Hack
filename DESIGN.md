<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Fleek Reseller Relist
description: Turn a box of unsorted secondhand clothes into ready-to-post listings in minutes.
colors:
  moss:          "oklch(0.420 0.060 130.0)"
  moss-deep:     "oklch(0.300 0.055 130.0)"
  clay:          "oklch(0.520 0.130 40.0)"
  stone:         "oklch(0.940 0.008 130.0)"
  stone-surface: "oklch(0.900 0.010 130.0)"
  ink:           "oklch(0.200 0.012 130.0)"
  ink-muted:     "oklch(0.520 0.010 130.0)"
typography:
  display:
    fontFamily: "Satoshi, 'Inter', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Satoshi, 'Inter', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
---

# Design System: Fleek Reseller Relist

## 1. Overview

**Creative North Star: "The Stone Courtyard at Dusk"**

Quiet moss on old stone, warm clay underfoot, low even light with no gloss and no shine. Nothing shouts; everything is considered. This is the feel of a well-kept physical object — a leather portfolio, a hand-thrown ceramic bowl — not a busy software dashboard. The reseller using this app is standing over a pile of clothes, moving fast through one item after another; the interface earns its "luxurious" character through restraint and precision, not through ornament, because ornament is friction against that task.

This system explicitly rejects: neon or saturated primary-color accents, flat sticker-style icon UI, the generic SaaS-white dashboard look (stark white backgrounds, harsh black text, boxy identical card grids), and the typical resale-marketplace aesthetic (Depop/Vinted/eBay's dense, colorful listing-grid style). If a screen could be mistaken for a resale marketplace's browse page, it has failed.

**Key Characteristics:**
- Natural, muted neutrals (stone, not stark white or cream) carry almost the entire surface
- One quiet accent color (moss) for emphasis, used sparingly — never decoratively
- A second, warmer accent (clay) reserved for status/condition signals only
- Small, purposeful motion that confirms actions rather than performing for its own sake
- Type does the hierarchy work; color is not used to create visual noise

## 2. Colors

A restrained palette: natural stone neutrals do nearly all the work, moss carries primary emphasis, and a single warm clay accent is reserved for status.

### Primary
- **Muted Moss** (oklch(0.420 0.060 130.0)): Primary actions, active states, the app's one confident brand color. Used on ≤10% of any given screen — buttons, the active nav item, key emphasis. Never used for backgrounds or large fills.
- **Moss Deep** (oklch(0.300 0.055 130.0)): Hover/pressed state for Muted Moss elements, and for text that needs brand-colored emphasis on a light surface.

### Secondary
- **Warm Clay** (oklch(0.520 0.130 40.0)): The one place color carries meaning beyond brand — condition/status signals (e.g. a "needs attention" defect flag, an urgent price-below-threshold cue). Distinct in both hue and lightness from Moss so the two never get confused. Reserved, not decorative: if Clay appears, it means something specific is being flagged.

### Neutral
- **Quiet Stone** (oklch(0.940 0.008 130.0)): Page background. A natural stone-gray with the faintest green undertone (tied to Moss's hue, not a warm cream/sand tint) — reads as material, not as flat corporate white.
- **Stone Surface** (oklch(0.900 0.010 130.0)): Cards, panels, the listing dashboard's row backgrounds — Quiet Stone pulled slightly toward Ink for layering without a hard border.
- **Ink** (oklch(0.200 0.012 130.0)): Body text, headings. Near-black with the same faint green undertone as the neutrals, so the whole system reads as one material rather than "colors + generic gray text."
- **Ink Muted** (oklch(0.520 0.010 130.0)): Secondary text — captions, timestamps, helper copy, defect notes.

### Named Rules
**The One Accent Rule.** Muted Moss is the only color used for interactive emphasis (buttons, links, active states). Warm Clay is the only color used for status/attention signals. No other color appears anywhere in the interface. If a third color feels necessary, the answer is better typography or spacing, not a new hue.

**The No-Cream Rule.** Backgrounds and neutrals never drift into the warm cream/sand/beige band. Every neutral in this system shares Moss's hue at near-zero chroma — stone, not sand.

## 3. Typography

**Display Font:** Satoshi (with Inter, system-ui fallback)
**Body Font:** Satoshi (with Inter, system-ui fallback)

**Character:** One warm humanist sans family carries the entire system, in varying weights. This keeps the interface calm and consistent — "luxurious" is achieved through restraint and generous spacing, not through an ornate display face competing with a workhorse body font.

### Hierarchy
- **Display** (500 weight, clamp(1.75rem, 4vw, 2.5rem), 1.15 line-height, -0.01em tracking): Screen titles, the item count/price total on the dashboard. Used sparingly — most screens have exactly one Display-weight moment.
- **Title** (500 weight, 1.25rem, 1.3 line-height): Listing titles on cards, section headers.
- **Body** (400 weight, 1rem, 1.5 line-height): Descriptions, form fields, general UI text. Cap line length at 65-75ch where prose appears.
- **Label** (500 weight, 0.8125rem, 0.02em tracking): Field labels, condition-grade badges (always paired with the letter A-D, never color alone), status pills (always paired with the word "Draft"/"Posted", never color alone).

### Named Rules
**The Weight-Not-Size Rule.** Prefer stepping up font weight before stepping up font size to create emphasis. Keeps the type scale tight and calm rather than shouty.

## 4. Elevation

Flat by default. This system conveys depth through the Stone Surface / Quiet Stone tonal layering (Section 2), not through shadows. Shadows appear only as a direct response to interaction state — a card lifting slightly on drag, a modal separating from the page behind it — never as ambient decoration on static elements.

### Shadow Vocabulary
- **Interaction lift** (`box-shadow: 0 2px 12px oklch(0.200 0.012 130.0 / 0.08)`): Applied only on active drag/press states, or a modal/sheet separating from the page. Soft, low-opacity, tied to Ink's hue so it reads as a natural shadow rather than a generic gray one.

### Named Rules
**The Flat-At-Rest Rule.** No static element carries a shadow. If it isn't moving or being interacted with, it sits flush on its tonal layer.

## 5. Components

*Component specifics are not yet defined — no code exists yet. The primitives below are placeholders consistent with the rules above; re-run `/impeccable document` once the capture and dashboard screens are built to capture the real, implemented components.*

### Buttons
- **Shape:** [to be resolved at implementation — likely a soft, moderate radius (~10-12px), avoiding both sharp corporate corners and fully pill-shaped]
- **Primary:** Muted Moss background, Stone-colored text (white text is wrong here per contrast rules — confirm exact text color against Moss's actual luminance at implementation time)
- **Hover/Focus:** Shift to Moss Deep, no shadow pop — a quiet color shift is enough
- **Secondary/Ghost:** Ink text on Stone Surface, no fill

### Cards
- **Corner Style:** [to be resolved at implementation, consistent with button radius]
- **Background:** Stone Surface
- **Shadow Strategy:** Flat at rest (see Elevation)
- **Border:** None by default — separation comes from the Stone/Stone Surface tonal step, not a stroke

### Inputs
- **Style:** [to be resolved at implementation — likely borderless with a Stone Surface fill, consistent with the no-border card philosophy]
- **Focus:** A visible Moss-colored focus ring for accessibility — never rely on a subtle glow alone

## 6. Do's and Don'ts

### Do:
- **Do** keep every neutral tied to Moss's hue at near-zero chroma — natural stone, never generic gray or warm cream.
- **Do** use weight and size, not new colors, to build hierarchy.
- **Do** pair every condition grade and status badge with its letter/word — color is never the only signal (WCAG requirement from PRODUCT.md).
- **Do** keep motion small and purposeful: a card settling into the dashboard, a status flipping — confirmation, not performance.
- **Do** respect `prefers-reduced-motion` with a crossfade/instant fallback on every animation.

### Don't:
- **Don't** use neon or saturated primary colors anywhere in the system.
- **Don't** let backgrounds drift into the cream/sand/beige band (roughly L 0.84-0.97, chroma < 0.06, hue 40-100) — that reads as the generic AI-tool default, not as this system's natural stone.
- **Don't** build flat sticker-style icons or a boxy, identical-card-grid dashboard — the failure mode is looking like a typical resale marketplace (Depop/Vinted/eBay) instead of a considered, premium tool.
- **Don't** add ambient shadows to static elements. Depth comes from tonal layering (Section 2/4).
- **Don't** introduce a third brand color. Moss and Clay are the entire palette; if something new feels necessary, solve it with type or spacing first.
- **Don't** choreograph entrance animations or scroll-driven sequences — motion here is Responsive (feedback + transitions), not a performance.
