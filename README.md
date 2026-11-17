# HP Calc

Personal, mobile-first car finance app. Vite + React + TypeScript, installable as a PWA.

- **Check tab**: type a registration → DVLA + MOT lookup → vehicle card, MOT traffic light, MOT history,
  road tax estimate, clean air zone check, and the hire purchase calculator with the term set
  automatically from the car's age.
- **Shortlist tab**: saved cars (on your phone only) with advert link, photo, notes, favourite / ruled out,
  price history, search, and a side-by-side compare view.

### Features added in round 3

- **Advert links**: paste the advert on the Check tab (Advert section) or with "Add by link". It's saved with
  the car; looking the same registration up again reconnects it to its card. Every shortlist card has an
  "Advert ↗" button, and the shortlist can be searched by reg, make, model, site or notes.
- **Price history**: each asking price you save is recorded with the date and website, e.g.
  "16 Nov 2026 — £13,995 · autotrader.co.uk", with ▼/▲ changes. If an advert title includes a £ price, it's
  offered as the asking price.
  *Other people's past sale prices* (as shown by some paid checks) come from commercial advert-history data
  providers; there's no free official source, so this app only records prices you've seen.
- **What might need fixing**: MOT advisories/defects are matched to the likely part or repair
  (`app/src/config/repairParts.ts`) with links to live prices for that make and model (eBay parts, Google
  repair costs). No prices are invented by the app.
- **Car picture**: a Wikipedia photo of the model when one is found (colour may differ, credited), otherwise an
  illustration in the car's listed colour. Exact-colour photos need a paid image service.
- **Quick prices**: £16.5k–£19k buttons plus −/+ £100 (`quickPrices` / `priceStep` in `financeRules.ts`).
- **Clear all** resets the whole Check screen, including the registration date.
- **Layout**: payment first, then a car card with key facts and actions, then Finance / MOT / Tax & ULEZ /
  Advert sections. Two columns from 680px; a side navigation rail from 900px.

## Run it on a computer

```bash
npm install
npm run dev        # http://localhost:5173 — mock mode (sample cars) when no keys are set
npm test           # unit tests
npm run build      # production build in dist/ (what Netlify publishes)
```

### Mock mode (works without any keys)

With no `DVLA_API_KEY`, `npm run dev` uses sample cars:

| Registration | What it shows |
| --- | --- |
| `MK22 GRN` | Green MOT; registered 14 Jul 2022 → max term 44 months (the worked example) |
| `AM21 BER` | Amber: MOT expires within 60 days, same advisory two years running |
| `RD20 FLT` | Red: major sill corrosion, mileage went backwards, outstanding recall |
| `EV25 ECS` | Electric, no MOT due yet, likely expensive car supplement |
| `NO24 MOT` | DVLA record but no MOT record |
| `OL14 DSL` | 2014 diesel: not eligible for finance, not ULEZ compliant |
| `R123 ABC` | 1998 car: DVLA month only ("approx"), pre-2001 tax |
| `SV19 DWN` / `RL19 MIT` | Pretend "service unavailable" / "rate limited" |
| anything else | "Registration not found" |

Advert links get a clearly labelled sample preview in mock mode.

## Netlify (you do this part)

`netlify.toml` already tells Netlify how to build (`npm run build`), what to publish (`dist`) and where the
server functions are (`netlify/functions`). Steps, one at a time:

1. In Netlify, choose **Add new site → Import an existing project → GitHub**, and pick **hp-calc**.
2. Choose the branch `claude/car-finance-calculator-pwa-iin3sp` (or `main` once it's merged). Leave the
   build settings as Netlify fills them in from `netlify.toml`.
3. Before (or right after) the first deploy, open **Site configuration → Environment variables** and add
   each name below with its value. Type the values only into Netlify — never into chat, code or GitHub.
4. Redeploy (**Deploys → Trigger deploy**) so the functions pick up the variables.
5. Open the Netlify address in Safari on your iPhone, look up a car, and enter your passcode once.
6. Share → **Add to Home Screen** from the Netlify address. (Delete the old GitHub Pages icon.)

### Environment variables

| Name | What it is |
| --- | --- |
| `APP_PASSCODE` | A passcode you choose; you type it once on your phone |
| `DVLA_API_KEY` | DVLA Vehicle Enquiry Service key |
| `MOT_CLIENT_ID` | From the DVSA email |
| `MOT_CLIENT_SECRET` | From the DVSA email (expires every 2 years — DVSA emails you first) |
| `MOT_API_KEY` | From the DVSA email (revoked if unused for 90 days) |
| `MOT_SCOPE_URL` | From the DVSA email |
| `MOT_TOKEN_URL` | From the DVSA email (a login.microsoftonline.com address) |
| `MOCK_MODE` | Optional: `1` forces sample cars even with keys |

`.env.example` lists the same names. To try real lookups on a computer, copy it to `.env` and fill it in —
`.env` is git-ignored and never committed.

### Checking the live site

- Open `https://<your-site>.netlify.app/api/health` in Safari. You should see `"functions": "running"`,
  `"mode": "live"` and `"ready": true`. `missing` lists any setting names that aren't set (names only —
  values are never shown).
- If instead you get a Netlify login page, the site has **Visitor access → Site protection** switched on.
  That login wall blocks the app's lookups (and the home-screen app can't sign in to it). Turn it off in
  Netlify under **Site configuration → Access & security → Visitor access**; lookups are still protected
  by `APP_PASSCODE`.
- If `/api/health` shows "Page not found", the functions weren't deployed — check the deploy's
  **Functions** list in Netlify shows `vehicle`, `mot`, `link-preview` and `health`.

The app's error messages say which of these it is; "isn't available on this copy" only appears on the
GitHub Pages copy.

## Keeping it up to date

- **Road tax — every April:** edit `app/src/config/vedRates.ts` from
  [GOV.UK vehicle tax rates](https://www.gov.uk/vehicle-tax-rate-tables), update `ratesFrom` and `checkedOn`,
  then run `npm test`.
- **Finance rules:** `app/src/config/financeRules.ts` (max term, max age at end, APR, deposits).
- **MOT traffic-light thresholds:** `app/src/config/motRules.ts`.
- **Clean air zones:** `app/src/config/cleanAirZones.ts`.

## How it's built

| Path | What |
| --- | --- |
| `app/src/domain/` | Plain logic, no UI (reusable in a native app): `finance/`, `mot/`, `tax/`, `cleanAir/`, `vehicle/`, `evaluate.ts` |
| `app/src/config/` | All rules and rates, one file each |
| `app/src/tools/check/` | Check tab |
| `app/src/tools/shortlist/` | Shortlist tab, add by link, compare, share entry point (`share.ts`) |
| `app/src/api/client.ts` | Calls the server functions (sends the passcode, never API keys) |
| `app/src/storage/` | Shortlist (IndexedDB, on the device) and passcode (localStorage) |
| `server/` | Server code: DVLA, MOT (token cache), link preview, passcode, rate limits, mock data |
| `netlify/functions/` | Thin Netlify Function wrappers: `/api/vehicle`, `/api/mot`, `/api/link-preview` |
| `server/devApi.ts` | Serves the same functions in `npm run dev` |

### Rules implemented

- **Car age** counts from the exact registration date (MOT data), or DVLA's month with the 1st assumed
  ("approx"), or a manual date. Whole months at the agreement start (default today, editable).
- **Max term** = lower of 60 and (96 − age in months). Under 12 → not eligible. You can pick a shorter term.
- **Payment**: monthly rate = (1 + 9.9%)^(1/12) − 1, standard amortisation, no fees.
- **MOT light**: red (no valid MOT, major/dangerous defects in the latest test, structural corrosion,
  mileage going backwards), amber (expires within 60 days, a fail in the last 2 tests, the same advisory
  in consecutive MOTs, more than 5 advisories, under 2,000 or over 20,000 miles a year, plain corrosion
  advisory), green otherwise. Under 3 years with no test → "No MOT due yet".
- **Road tax**: pre-March 2001 by engine size; March 2001 – March 2017 by CO2 band; April 2017 onwards
  standard rate plus the expensive car supplement in years 2–6 (£40,000 threshold, £50,000 for electric;
  electric cars registered before 1 April 2025 exempt). DVLA's `artEndDate` flags likely cases.
- **Clean air**: Euro 4 petrol / Euro 6 diesel (date-based guess when DVLA has no Euro status), always
  labelled "likely" with links to the official checkers.

### Security

- API keys are read only from environment variables on the server and never sent to the browser or logged.
- Every function requires the passcode (`x-app-passcode` header). Wrong passcodes lock out for 15 minutes
  after 8 tries. Each device is limited to 40 requests per 10 minutes, and DVLA/DVSA calls are capped at
  600 a day (Netlify Blobs counters on Netlify; memory locally).
- Registrations go in request bodies, not URLs, and are never logged.
- The link preview only fetches public http(s) pages (no private or local addresses).

### Native app later (Capacitor)

- The logic in `app/src/domain/` has no browser or React dependencies.
- Set `VITE_API_BASE=https://<your-netlify-site>` when building the native app so it calls the Netlify functions.
- Share sheet: an iOS Share Extension should open the app with the shared link — `tools/shortlist/share.ts`
  (`readSharedLink`) and `AddByLink` (`initialUrl`) already handle it. Today `?share=<url>` does the same on the web.

## GitHub Pages copy (calculator only)

https://insaneinthewaynebrain.github.io/hp-calc/ still serves the earlier calculator-only build from the
repository root. It can't do lookups (no server functions). Once Netlify is live, delete the root build files
(`index.html`, `assets/`, `sw.js`, `workbox-*.js`, `manifest.webmanifest`, icons, `.nojekyll`) and turn off Pages.
`npm run deploy` would refresh that copy with the new app (lookups then show a "not available here" message).

## Screen sizes

The layout adapts automatically (no device detection) and switches live when a phone is rotated, folded or
unfolded: compact under 360px, single column on phones, two columns from 680px and in landscape, and one
column per screen half on foldables that report a hinge.
