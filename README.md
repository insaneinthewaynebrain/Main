# Car Finance

Personal, mobile-first car finance tools. Vite + React + TypeScript, installable as a PWA.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, for testing on a phone)
npm test           # unit tests for the finance maths
npm run build      # production build in dist/ (with service worker)
npm run preview    # serve the production build
```

## Where things live

| Path | What |
| --- | --- |
| `src/config/financeRules.ts` | **All rules**: max term, max car age at end, minimum term, APR, deposit range, default registration date |
| `src/finance/calculator.ts` | Pure maths (no React): car age, available term, amortisation, full quote |
| `src/finance/calculator.test.ts` | Unit tests (Vitest) |
| `src/tools/registry.tsx` | List of tools; each entry becomes a tab in the bottom bar |
| `src/tools/carFinance/` | The car finance calculator screen |

## Adding a tool

1. Create `src/tools/<name>/<Name>.tsx` exporting a component.
2. Add an entry to `tools` in `src/tools/registry.tsx` (id, label, title, icon, component).

## Calculation notes

- Car age = whole months from the 1st of the registration month to today.
- Available term = min(60, 96 − age). Below 12 months → not eligible.
- Monthly rate = (1 + APR)^(1/12) − 1; payment = P·r / (1 − (1 + r)^−n).
- Total interest = payments × term − amount financed. Total payable = payments × term + deposit.

## Installing on iPhone

Open the site in Safari → Share → **Add to Home Screen**. Service workers need HTTPS (or localhost), so for
a proper install deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, …).
Icons are generated from `public/icon.svg` with `npm run icons` (needs Playwright).
