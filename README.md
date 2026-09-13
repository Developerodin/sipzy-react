# Sipzy React

Vite + React SPA — pixel port of the Sipzy marketing site with **GSAP** + **Lenis**. Specs live in this folder so it can become its own repo later.

The vanilla site (`index.html`, `styles.css`, `app.js`, root `assets/`) stays at the **parent** folder and still runs independently.

## Specs

- [`docs/SECTION-MAP.md`](docs/SECTION-MAP.md) — section layout, breakpoints, scroll/hover behavior
- [`docs/ASSETS.md`](docs/ASSETS.md) — asset inventory and path rules

## Stack

- React 19 + Vite
- GSAP ScrollTrigger (registered in `ScrollProvider`)
- Lenis smooth scroll (disabled when `prefers-reduced-motion: reduce`)
- CSS: ported vanilla styles at `src/styles/styles.css` (class names preserved)

## Scripts

```bash
cd sipzy-react
npm install
npm run dev      # local Vite → http://127.0.0.1:5173
npm run build    # production → dist/
npm run preview  # preview production build
npm run lint
```

## Vercel

Deploy this folder as the project root (or set Root Directory to `sipzy-react`). [`vercel.json`](vercel.json) rewrites all routes to `index.html`.

## Vanilla site (parent)

```bash
python3 -m http.server 8000
```

Compare side-by-side at 375 / 640 / 747 / 768 / 900 / 1280 / 1440.
