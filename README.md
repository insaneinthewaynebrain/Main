# HP Calc

Personal, mobile-first car finance tools. Vite + React + TypeScript, installable as a PWA.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, for testing on a phone)
npm test           # unit tests for the finance maths
npm run build      # production build in dist/ (with service worker)
npm run preview    # serve the production build
npm run deploy     # build, then copy the site to the repo root for GitHub Pages
```

## Publishing (GitHub Pages)

Live at **https://insaneinthewaynebrain.github.io/hp-calc/**. Pages serves this branch's root folder
as-is (no build step), so the root holds the *built* site: `index.html`, `assets/`, `sw.js`,
`manifest.webmanifest` and icons. **Don't edit those by hand.** Change the source in `app/`, then:

```bash
npm run deploy
git add -A && git commit -m "Publish" && git push
```

All paths are relative (`base: './'` in `vite.config.ts`), so the site works from the `/hp-calc/` sub-folder.

## Where things live

| Path | What |
| --- | --- |
| `app/` | Source: `index.html` template, `src/`, `public/` |
| `app/src/config/financeRules.ts` | **All rules**: max term, max car age at end, minimum term, APR, deposit range, default registration date |
| `app/src/finance/calculator.ts` | Pure maths (no React): car age, available term, amortisation, full quote |
| `app/src/finance/calculator.test.ts` | Unit tests (Vitest) |
| `app/src/tools/registry.tsx` | List of tools; each entry becomes a tab in the bottom bar |
| `app/src/tools/carFinance/` | The car finance calculator screen |

## Adding a tool

1. Create `app/src/tools/<name>/<Name>.tsx` exporting a component.
2. Add an entry to `tools` in `app/src/tools/registry.tsx` (id, label, title, icon, component).

## Calculation notes

- Car age = whole months from the 1st of the registration month to today.
- Available term = min(60, 96 − age). Below 12 months → not eligible.
- Monthly rate = (1 + APR)^(1/12) − 1; payment = P·r / (1 − (1 + r)^−n).
- Total interest = payments × term − amount financed. Total payable = payments × term + deposit.

## Installing on iPhone

Open https://insaneinthewaynebrain.github.io/hp-calc/ in Safari → Share → **Add to Home Screen**.
Icons are generated from `app/public/icon.svg` with `npm run icons` (needs Playwright).
