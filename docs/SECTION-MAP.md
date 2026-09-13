# Sipzy Section Map (pixel-match source of truth)

Derived from root vanilla [`index.html`](../../index.html), [`styles.css`](../../styles.css), and [`app.js`](../../app.js). Use this when cloning into React under `sipzy-react/`. Keep class names and CSS rules; reimplement scroll/hover with **GSAP + Lenis** so motion feels identical.

Paths below use site-root form `assets/...`. In the React app serve them from `public/assets/` as `/assets/...`.

---

## Shared design system

### CSS tokens (`:root`)

| Token | Value |
|-------|--------|
| `--ink` | `#170617` |
| `--ink-soft` | `#32102f` |
| `--cream` | `#fff4e8` |
| `--paper` | `#fffaf4` |
| `--purple` | `#7f31f3` |
| `--jamun` | `#5d145f` |
| `--pink` | `#ff3e8b` |
| `--orange` | `#ff7a18` |
| `--acid` | `#b7ed37` |
| `--red` | `#ff404c` |
| `--line` | `rgba(23, 6, 23, 0.16)` |
| `--pad` | `clamp(1.25rem, 5vw, 5rem)` · **≤640px:** `1.15rem` |

### Typography

- Body: `"DM Sans", system-ui, sans-serif` (Google Fonts weights 400/500/600/700)
- Display: `"Fraunces", …` opsz 9..144, weights 600/700/900 (loaded in `index.html`)
- Body default color `--ink`, background `--cream`
- Selection: white on `--purple`

### Global layout rules

- `html` / `body`: `overflow-x: clip`, `max-width: 100%`
- `html { scroll-behavior: smooth }` (disabled under reduced motion)
- `.section-pad`: horizontal pad via `--pad`, vertical section padding as defined per block
- Images: `max-width: 100%; display: block`

### Breakpoints (canonical)

| Query | Used for |
|-------|----------|
| `max-width: 640px` | Hero mobile video + copy; FTS opener; Find field; pad; product rail columns |
| `max-width: 747px` / `min-width: 748px` | Find Sipzy orbit layout (stack vs open grid with story) |
| `max-width: 768px` | FTS compact (3 frags, spacer height, copy positions) |
| `max-width: 900px` / `min-width: 901px` | Header nav hide; duo/ritual stack; ritual card sticky stack; ritual stagger delays |
| `(hover: hover) and (pointer: fine)` | Find orbit pointer gravity (desktop-like only) |
| `prefers-reduced-motion: reduce` | Kill animations; simplify hero/FTS/find/duo/mc/ritual |

### Shared JS systems (`app.js`)

| System | Mechanism | React port note |
|--------|-----------|-----------------|
| `.reveal` | `IntersectionObserver` threshold `0.14`, rootMargin `0px 0px -5%` → add `.is-visible` once | GSAP ScrollTrigger `once: true` or keep IO |
| Header scroll | Toggle `.is-scrolled` when `scrollY > hero.offsetTop + sticky + spacer - innerHeight * 0.6` | Sync with Lenis scroll |
| In-page anchors | `a[href^="#"]` → `preventDefault` + `scrollIntoView({ behavior: "smooth" })`; `#contact` uses `scrollToContactCover` | Lenis `scrollTo` |
| Scroll direction | Track `scrollingDown` for ritual title fall + pour-fill | Need Lenis scroll listener |
| `prefersReducedMotion()` | `matchMedia("(prefers-reduced-motion: reduce)")` | Gate all GSAP timelines |

### Reveal CSS

- `.reveal`: starts `opacity: 0` + slight `translateY`; `.reveal.is-visible` → `opacity: 1` (transition ~700–800ms)

---

## 0. Skip link

- `.skip-link` → `#main`
- Fixed top-left; off-screen until `:focus`

---

## 1. Header — `.site-header` `[data-header]`

### Purpose

Fixed chrome: wordmark, primary nav, “Say hello” pill.

### DOM

```
header.site-header[data-header]
  a.wordmark → img.wordmark-logo--white + img.wordmark-logo--black
  nav → #find, #range, #story, #ritual
  a.header-pill → #contact
```

### Layout / alignment

- `position: fixed; z-index: 50; width: 100%`
- Grid: `1fr auto 1fr`, centered nav, pill on right
- Padding: `1.1rem var(--pad)`; scrolled: `padding-block: 0.75rem`
- Default color: white (over hero video)
- `.is-scrolled`: color `--ink`, `background: rgba(255,244,232,0.9)`, blur `16px`, bottom hairline shadow
- Logo swap: white visible by default; black when `.is-scrolled`
- Logo height: `clamp(2.2rem, 4vw, 3rem)`

### ≤900px

- Grid → `1fr auto`; **nav hidden**
- Pill remains

### ≤640px

- Tighter header padding / pill font

### Behavior

- No hover-required for logo swap (scroll-driven)
- Nav links: smooth scroll to sections
- Contact pill: special cover scroll (see Manifesto→Contact)

### GSAP/Lenis

- Drive `.is-scrolled` from Lenis scroll position using the same threshold formula
- Keep CSS transitions on color/background/padding

---

## 2. Hero scrub — `#top` `.hero-scroll`

### Purpose

Scroll-scrubbed ~12s bottle film with staged copy overlays; ticker + intro nested as “covers” after spacer.

### DOM structure

```
section#top.hero-scroll
  .hero-sticky
    video.hero-video[data-scroll-video] (poster hero-poster)
      source mobile mp4 media (max-width: 640px)
      source web mp4
    .hero-shade
    .hero-progress > i[data-progress]
    .hero-copy
      .eyebrow
      .hero-stage[data-stage="0..3"]  (0 has h1; 3 has .round-link)
    .scroll-cue
  .hero-scrub-spacer[data-scrub-spacer]
  section.ticker.section-cover   (see §3)
  section#story.intro…          (see §4)
```

### Layout

- Sticky viewport film; tall spacer drives scrub distance
- Progress = `(scrollY - hero.offsetTop) / (stickyH + spacerH - innerHeight)`
- Video paused; `currentTime = progress * duration` (buffered-aware seek loop via `requestAnimationFrame`)
- Stages: progress `<0.24` → 0; `<0.5` → 1; `<0.76` → 2; else 3 (class `.is-active`)
- `.is-covered` when first `.section-cover` top < `0.98 * innerHeight` and sticky still visible (skipped if reduced motion)
- Progress bar: `scaleX(progress)` on `[data-progress]`
- Mobile source swap: `matchMedia("(max-width: 640px)")`

### ≤640px

- Spacer ~`230vh`; sticky `min-height: 34rem`
- Stages sit toward bottom; supporting `<p>` hidden
- Stronger bottom shade gradient
- Mobile mp4 preferred

### Reduced motion

- Hide video; sticky uses poster as CSS background (`assets/hero-poster.png`)
- No cover transform on sticky

### Assets

- `/assets/video/sipzy-scroll-hero-web.mp4`
- `/assets/video/sipzy-scroll-hero-mobile.mp4`
- `/assets/hero-poster.png`

### JS entry

- Top of `app.js`: `paintHeroFrame`, `scrubVideo`, `updatePageState`, `applyVideoSource`, unlock on first pointer/touch

### GSAP/Lenis

- Prefer ScrollTrigger scrub on spacer range driving `video.currentTime` + stage classes
- Must preserve stage thresholds and dual video sources

---

## 3. Ticker — `.ticker.section-cover`

### Purpose

Infinite brand-line marquee sitting over/after hero scrub.

### Layout

- Full-bleed; acid (`--acid`) band with ink borders
- `.ticker-track` with two `.ticker-group` duplicates for seamless loop
- CSS keyframe animation on track (disabled under reduced motion)

### Copy phrases

`Sip. Chill. Repeat.` · `Fruit-forward moods.` · `Pop. Sip. Repeat.` · `Fruit with a Kick.` · `8% Easy. 16% Bold.` · `Pick your mood.` (✦ separators)

### GSAP/Lenis

- Can keep CSS marquee or GSAP infinite `xPercent`; feel must match continuous left scroll

---

## 4. Intro / story — `#story` `.intro.section-cover`

### Purpose

Brand statement after hero.

### DOM

```
.intro-orbit (8% / 16% decorative spans)
.kicker.reveal
h2.display-copy.reveal
.intro-grid.reveal → two paragraphs
```

### Layout

- Cream section; purple accents on kicker/display
- `.intro-grid`: two columns on desktop → one column ≤900px
- `.intro-orbit`: absolute decorative ring; smaller/right-shifted ≤900px

### Behavior

- Reveal-on-scroll only (no scrub)

---

## 5. From fruit to Sipzy — `#from-fruit` `[data-fruit-to-sipzy]`

### Purpose

Sticky scroll story: fruit → fragment vortex → bottle reveal, cycling **7 × 8% flavours**.

### DOM

```
.fts-sticky
  .fts-bg[data-fts-bg]
  .fts-stage
    .fts-bottle[data-fts-bottle] > img[data-fts-bottle-img]
    .fts-frags → 6× .fts-frag[data-fts-frag]
    .fts-fruit--main[data-fts-fruit] > img[data-fts-fruit-img]
    .fts-fruit--next[data-fts-next] > img[data-fts-next-img]
  .fts-copy
    .fts-opener[data-fts-opener]
    .fts-phase[data-fts-phase]
    .fts-reveal[data-fts-reveal] (name/meta/line)
    .fts-blurb[data-fts-blurb]
  .fts-sr[data-fts-live]
.fts-spacer[data-fts-spacer]
```

### Layout

- Sticky full viewport; tall spacer (desktop taller; **≤768px:** `700vh`; **reduced:** `280vh`)
- Stage elements centered; bottle/fruit sizes via `min(…vw, …rem)`
- Copy: opener top; reveal bottom-left; blurb right (desktop) / bottom clamped ≤768px
- Accent wash via `--fts-accent` RGB triple on cream gradients

### Flavour cycle order (from `app.js`)

| # | id | Accent | Fruit | Bottle |
|---|----|--------|-------|--------|
| 0 | watermelon | `#ff3e8b` | fruits/watermelon.png | 07-watermelon-wave… |
| 1 | mango | `#ff7a18` | fruits/mango.png | 03-mango-mood… |
| 2 | orange | `#ff9a2e` | fruits/orange.png | 04-orange-voltage… |
| 3 | cranberry | `#ff404c` | fruits/cranberry.png | 01-cranberry-affair… |
| 4 | jamun | `#7f31f3` | fruits/Group 2.png | 02-jamun-shot… |
| 5 | mojito | `#b7ed37` | fruits/mojito drift.png | 05-mojito-drift… |
| 6 | lemonade | `#f6d94d` | fruits/lemonade twist.png | 06-lemonade-twist… |

Progress splits evenly across 7 flavours (`progress * COUNT`). Per-flavour `t` drives poses:

| Phase (t) | Motion |
|-----------|--------|
| 0–0.12 | Fruit scale pulse |
| 0.12–0.22 | Fruit fades |
| 0.10–0.68 | Frags appear → vortex → collapse |
| 0.48–0.68 | Bottle rises into place (+ blur on desktop) |
| 0.66–0.78 | Name/meta/line + blurb pulse reveal |
| 0.82–1 | Bottle exits; next fruit enters (unless last) |

Compact (`≤768px`): distance scale ~0.5–0.55; only **3** frags; hide `.fts-phase`.

Classes: `.is-hot` while in view (non-reduced); `.is-reduced`; bottle `.is-settled` when `t >= 0.68` (and before exit or last).

### JS entry

- IIFE “From fruit to Sipzy” in `app.js` (~line 925+): `sectionProgress`, `paint`, `fragPose`, `bottlePose`, etc.

### GSAP/Lenis

- One ScrollTrigger timeline scrubbed across spacer; replicate pose math or port functions verbatim
- Preload next fruit/bottle images as today

---

## 6. Find your Sipzy — `#find` `[data-find-sipzy]`

### Purpose

Interactive 16% bottle orbit (“flavour gravity”).

### DOM

```
.find-bg / .find-glass
.find-sipzy-inner
  .find-head.reveal
  .find-stage[data-find-stage]
    .find-play[data-find-play]
      .find-field[data-find-field]
        .find-orbit-guide, .find-ripple[data-find-ripple]
        .find-orbit[data-find-orbit] → 5× button.find-orbit-item[data-bottle]
        .find-detail[data-find-detail]
      .find-story[data-find-story]
      .find-controls → .find-nav prev/next
  ul.find-fallback[data-find-fallback]
```

### Bottles (orbit angles degrees)

| id | Name | Accent | PNG | angle |
|----|------|--------|-----|-------|
| jamun | Jamun Cask | `#6B2D8B` | 11-jamun-cask… | -90 |
| mango | Mango Mirage | `#E08A2E` | 12-mango-mirage… | -18 |
| orange | Orange Oak | `#F07828` | 10-orange-oak… | 54 |
| cranberry | Cranberry Cellar | `#9B1C3A` | 09-cranberry-cellar… | 126 |
| mojito | Mojito Heritage | `#A8C93A` | 08-mojito-heritage… | 198 |

### Layout

- Cream section, ink top border; soft pastel radial `.find-bg` + glass texture
- Field square-ish; orbit radius from field size (`--orbit`)
- Selected: bottle scales to ~1.95 desktop / ~1.72 mobile-like; detail under field; story appears
- **≥748px + `.is-open`:** grid `field | story`, nav under field
- **≤747px:** stacked field → story → nav; larger touch targets
- **≤640px:** slightly tighter field/detail type

### Behavior modes

| Mode | Condition | Behavior |
|------|-----------|----------|
| Physics orbit | fine pointer + width >747 + not reduced | Idle float on circle; pointer gravity; click select; ripple; prev/next; swipe |
| Mobile-like | `≤747` OR coarse pointer | Same select UI without pointer gravity; static-er idle |
| Fallback list | reduced motion (and setupFallback) | Show `ul.find-fallback`; hide complex field as coded |
| Reduced | `prefers-reduced-motion` | Snap static layout; no ripple animation; simplify detail transitions |

### JS entry

- IIFE “Find your Sipzy” (~line 340+): `measure`, `updateIdlePhysics`, `selectBottle`, `tick`, etc.

### GSAP/Lenis

- Keep rAF physics or rebuild with GSAP; selection/hover must match scale, blur, opacity, accent ripple

---

## 7. Range — `#range` `.range-section`

### Purpose

8% / 16% product rail switcher.

### DOM

```
.section-head.reveal → title + .range-toggle [data-range="8"|"16"]
.range-meta.reveal → [data-range-intro] + [data-range-count]
.product-rail[data-product-rail]  (JS-filled .product-card)
```

### Data (`products` in `app.js`)

- Default active: **16% Bold**
- Images: `assets/products-webp/{8|16}/sipzy-….webp`
- 8%: 7 cards, “01—07”, intro easy-drift copy, size 275 ml
- 16%: 5 cards, “01—05”, intro after-dark copy, size 330 ml
- Section class `.is-bold` when 16%

### Layout

- Horizontal scroll rail; card min-heights; `--delay` stagger on `.is-in`
- Swap: `.is-swapping` opacity/transform transition ~320ms
- ≤640px: rail columns `min(84vw, 22rem)`; toggle full width

### Behavior

- `IntersectionObserver` threshold `0.12` → `.is-in` once
- Reduced: immediate `.is-in`, no swap motion

### GSAP/Lenis

- Staggered card enters via ScrollTrigger; toggle can be GSAP crossfade matching opacity/transform

---

## 8. Duo compare — `.duo` `[data-duo]`

### Purpose

Side-by-side 8% vs 16% strength statement.

### DOM

```
article.duo-panel--easy → copy + watermelon-wave 8% PNG
article.duo-panel--bold → copy + jamun-cask 16% PNG
```

### Layout

- 2-column grid → 1 column ≤900px (border moves top)
- Large % typography; bottle images absolute right, mid-height

### Behavior

- IO threshold `0.18` toggles `.is-visible` (enter/leave) → CSS clip/slide animations on panels/images
- Reduced: static, no clip animation

---

## 9. Ritual — `#ritual` `.ritual`

### Purpose

Three-step serve guide.

### DOM

```
.ritual-head → kicker.reveal + h2.ritual-title
.ritual-grid → 3× .ritual-card.reveal (01 Chill / 02 Pop / 03 Sipzy)
```

### Layout

- Desktop 3-column cards
- ≤900px: single column; cards **sticky stacked** at `top: 4.75rem / 6rem / 7.25rem`
- ≥901px: reveal stagger delays 0 / 100ms / 200ms on cards 2–3

### Behavior

- Cards use shared `.reveal`
- Title: class `.is-droppable` when motion allowed; on intersect while scrolling down from below → `.is-falling` with `--ritual-fall` from `-getBoundingClientRect().top`; then `.is-settled`
- Reduced: title always settled, no fall

### JS entry

- Ritual title IIFE (~line 273+)

---

## 10. Manifesto → Contact — `.mc-push` `[data-mc-push]` + `#contact`

### Purpose

Sticky horizontal push: orange manifesto slides away; cream contact slides in.

### DOM

```
.mc-sticky > .mc-stage
  section.manifesto.mc-panel[data-mc-from]
  section#contact.contact.mc-panel[data-mc-to]
    .pour-fill em, a.contact-pill mailto:hello@sipzy.in
.mc-spacer[data-mc-spacer]  (100vh)
```

### Scrub math

- `p = clamp01(-section.top / (stickyH + spacerH - innerHeight))`
- `from.transform = translate3d(p * 100%, 0, 0)`
- `to.transform = translate3d((p - 1) * 100%, 0, 0)`
- Pour fill: add `.is-filled` when `p >= 0.86` and scrolling down; clear if `p < 0.2`
- `scrollToContactCover`: scroll to `section.offsetTop + scrubDistance`

### Reduced motion

- Unstick panels; stack manifesto then contact; hide spacer; no transforms; pour-fill solid color

### Manifesto visual

- Orange bg; pink/purple ring decorations via `::before`/`::after`
- Huge Fraunces headline; ink `<em>`

### Contact visual

- Cream; mailto pill; pour-fill gradient text effect when filled

---

## 11. Footer — `.site-footer`

### Purpose

Closing wordmark, tagline, anchors, legal.

### Layout

- Multi-column desktop → single column ≤640px
- White logo `sipzy-logo-white.svg`
- Links: Find / Range / Story / Serve
- Legal drinking-age disclaimer

---

## Pixel-match checklist for React port

1. Preserve class names from this map so `styles.css` applies unchanged.
2. Wire Lenis → ScrollTrigger `scrollerProxy` / ticker update before porting scrub sections.
3. Port hero, FTS, find, mc-push as isolated hooks/components with identical math constants.
4. Keep all `prefers-reduced-motion` branches.
5. Fonts: load DM Sans + Fraunces in React `index.html` exactly as vanilla.
6. Theme color / meta description from vanilla head.
7. Verify at widths **375, 640, 747, 768, 900, 1280, 1440**.
