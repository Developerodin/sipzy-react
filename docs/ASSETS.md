# Sipzy Assets Map (pixel-match placement)

All UI media for the React port lives in [`public/assets/`](../public/assets/). Reference URLs as **`/assets/...`**.

Vanilla source of truth: repo-root `assets/` (copied into this project). Specs also informed by [`app.js`](../../app.js) and [`index.html`](../../index.html).

---

## Quick path conventions

| Context | Path form |
|---------|-----------|
| React `src` / JSX `src=` | `/assets/...` |
| CSS `url()` inside `src/styles/styles.css` | `/assets/...` (absolute from site root) |
| Vanilla HTML/JS (root site) | `assets/...` relative |

---

## 1. Logos

| File | Size use | Placement |
|------|----------|-----------|
| `/assets/sipzy-logo-white.svg` | Header default; footer wordmark | `.wordmark-logo--white`, `.footer-wordmark img` |
| `/assets/sipzy-logo-black.svg` | Header when `.site-header.is-scrolled` | `.wordmark-logo--black` (CSS display swap) |

### Legacy duplicates (not referenced in HTML/JS)

| File | Note |
|------|------|
| `/assets/Sipzy white logo.svg` | Same art as white logo; unused by markup |
| `/assets/Sipzy black logo.svg` | Same art as black logo; unused by markup |

**Rule:** Prefer kebab-case `sipzy-logo-*.svg` only.

---

## 2. Hero media

| File | Role | Where |
|------|------|-------|
| `/assets/hero-poster.png` | Video poster; reduced-motion sticky background | `<video poster>`; CSS `.hero-sticky` under `prefers-reduced-motion` |
| `/assets/video/sipzy-scroll-hero-web.mp4` | Desktop/tablet scrub film | `<source>` default; JS `videoSources.desktop` when width **>640** |
| `/assets/video/sipzy-scroll-hero-mobile.mp4` | Mobile scrub film | `<source media="(max-width: 640px)">`; JS when **≤640** |

**Loading:** `preload="auto"`, `muted`, `playsinline`. Unlock play/pause once on first pointer/touch.

**Alignment:** Full-bleed cover in `.hero-sticky`; mobile `object-position: center`. Do not crop differently per flavour—film is authored.

---

## 3. Bottle PNGs (1254×1254 transparent)

Directory: `/assets/bottles/`

| File | Name | ABV | Used in |
|------|------|-----|---------|
| `01-cranberry-affair-8pct-275ml.png` | Cranberry Affair | 8% | FTS cycle |
| `02-jamun-shot-8pct-275ml.png` | Jamun Shot | 8% | FTS cycle |
| `03-mango-mood-8pct-275ml.png` | Mango Mood | 8% | FTS cycle |
| `04-orange-voltage-8pct-275ml.png` | Orange Voltage | 8% | FTS cycle |
| `05-mojito-drift-8pct-275ml.png` | Mojito Drift | 8% | FTS cycle |
| `06-lemonade-twist-8pct-275ml.png` | Lemonade Twist | 8% | FTS cycle |
| `07-watermelon-wave-8pct-275ml.png` | Watermelon Wave | 8% | FTS default + Duo easy panel |
| `08-mojito-heritage-16pct-330ml.png` | Mojito Heritage | 16% | Find orbit |
| `09-cranberry-cellar-16pct-330ml.png` | Cranberry Cellar | 16% | Find orbit |
| `10-orange-oak-16pct-330ml.png` | Orange Oak | 16% | Find orbit |
| `11-jamun-cask-16pct-330ml.png` | Jamun Cask | 16% | Find orbit + Duo bold panel |
| `12-mango-mirage-16pct-330ml.png` | Mango Mirage | 16% | Find orbit |

### Placement rules — bottles

| Surface | Slot | Exact asset | Notes |
|---------|------|-------------|-------|
| FTS `[data-fts-bottle-img]` | Center stage | Cycles rows 01–07 per flavour index | Initial HTML seed: watermelon `07` |
| Find `[data-bottle="…"] img` | Orbit nodes | 08–12 as table above | `loading="lazy"`; `draggable={false}` |
| Duo easy | Right of panel | `07-watermelon-wave…` | `loading="lazy"` |
| Duo bold | Right of panel | `11-jamun-cask…` | `loading="lazy"` |
| Range rail | Product cards | **WebP** (not these PNGs) | See §5 |

Docs-only (not required for runtime): root `assets/bottles/BOTTLE-ANIMATIONS.md`, `FROM-FRUIT-TO-SIPZY-FLAVOURS.md` (not copied into `public/`).

---

## 4. Fruit PNGs

Directory: `/assets/fruits/`

| File | Flavour | FTS role |
|------|---------|----------|
| `watermelon.png` | Watermelon Wave | Main fruit + 6 frags (seeded in HTML) |
| `mango.png` | Mango Mood | Main + frags when active |
| `orange.png` | Orange Voltage | Main + frags |
| `cranberry.png` | Cranberry Affair | Main + frags |
| `Group 2.png` | Jamun Shot | Main + frags (note space-free? filename has space: `Group 2.png`) |
| `mojito drift.png` | Mojito Drift | Main + frags (space in filename) |
| `lemonade twist.png` | Lemonade Twist | Main + frags (space in filename) |

### Placement rules — fruits

| Element | Behavior |
|---------|----------|
| `[data-fts-fruit-img]` | Current flavour fruit, centered, float animation |
| `[data-fts-frag] img` ×6 | Same fruit src; ≤768px only first 3 visible (CSS) |
| `[data-fts-next-img]` | Next flavour fruit; opacity 0 until exit phase |

**URL encoding:** Filenames with spaces must be encoded in URLs (`mojito%20drift.png`) or imported carefully. Prefer keeping exact filenames for parity with vanilla.

**Preload:** JS preloads current + next fruit/bottle when scrubbing.

---

## 5. Range product WebPs

Directory: `/assets/products-webp/{8|16}/`

### 8% (`products[8]` order in `app.js`)

| image filename | Display name |
|----------------|--------------|
| `sipzy-jamun-shot-8pct-275ml.webp` | Jamun Shot |
| `sipzy-mango-mood-8pct-275ml.webp` | Mango Mood |
| `sipzy-watermelon-wave-8pct-275ml.webp` | Watermelon Wave |
| `sipzy-orange-voltage-8pct-275ml.webp` | Orange Voltage |
| `sipzy-cranberry-affair-8pct-275ml.webp` | Cranberry Affair |
| `sipzy-mojito-drift-8pct-275ml.webp` | Mojito Drift |
| `sipzy-lemonade-twist-8pct-275ml.webp` | Lemonade Twist |

Path pattern: `/assets/products-webp/8/{image}`

### 16% (`products[16]` order)

| image filename | Display name |
|----------------|--------------|
| `sipzy-jamun-cask-16pct-330ml.webp` | Jamun Cask |
| `sipzy-mango-mirage-16pct-330ml.webp` | Mango Mirage |
| `sipzy-orange-oak-16pct-330ml.webp` | Orange Oak |
| `sipzy-cranberry-cellar-16pct-330ml.webp` | Cranberry Cellar |
| `sipzy-mojito-heritage-16pct-330ml.webp` | Mojito Heritage |

Path pattern: `/assets/products-webp/16/{image}`

### Extra files in folders (not used by `products` map)

| File | Note |
|------|------|
| `16/sipzy-jamun-cask-16pct-330ml tilted.png` | Unused by current JS |
| `16/steel cap.png` | Unused by current JS |

**Placement:** Only inside dynamically rendered `.product-card > img` in `[data-product-rail]`. Alt: `Sipzy {name} {8|16}% bottle`. `loading="lazy"`.

---

## 6. Other / unused in current markup

| File | Status |
|------|--------|
| `/assets/range-lineup.png` | Present in assets; **not** referenced in current `index.html` / `app.js` |

---

## 7. Section → asset matrix

| Section | Assets mounted |
|---------|----------------|
| Header | white + black logos |
| Hero | poster + web/mobile mp4 |
| Ticker | none (text only) |
| Intro | none |
| From fruit | 7 fruit PNGs + 7 × 8% bottle PNGs (cycled) |
| Find Sipzy | 5 × 16% bottle PNGs |
| Range | 7 or 5 webps per toggle |
| Duo | watermelon 8% PNG + jamun 16% PNG |
| Ritual | none (unicode icons in CSS/HTML) |
| Manifesto / Contact | none |
| Footer | white logo |

---

## 8. Loading & performance rules (match vanilla)

1. Hero video: eager, `preload="auto"`, poster always set.
2. FTS bottle/fruit: initial watermelon in HTML; others swapped via JS with `decoding="async"` / `Image()` preload.
3. Find bottles: `loading="lazy"` in markup.
4. Range cards: `loading="lazy"` when painted.
5. Duo images: `loading="lazy"`.
6. Do not lazy-load logos in header (above fold).

---

## 9. React copy checklist

When cloning UI:

1. Use `/assets/...` in JSX and CSS.
2. Keep filename spaces for fruit assets unless you rename **and** update every map entry.
3. Range must use **webp** paths under `products-webp`, not bottle PNGs.
4. Find / Duo / FTS must use **PNG** cutouts under `bottles/`.
5. Dual hero videos must swap at **640px** exactly as today.
