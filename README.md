# Shipping App — Customer & Agent PWA

Client-facing PWA for CashGearERP's shipping/3PL system. See [CLAUDE.md](./CLAUDE.md) for full project context, architecture decisions, and open questions.

- **Customer** — track shipments, view waybill/COD status
- **Agent** — scan pickup/delivery waybills, manage COD collection, view assigned manifest

## Stack

- Vite + React + TypeScript
- react-router-dom, role-gated via `src/auth/roles.ts` (`NAV_ACCESS`)
- vite-plugin-pwa for the manifest + service worker (app-shell precaching)
- IndexedDB-backed offline scan queue (`src/lib/scanQueue.ts`) for agent scans in low-signal areas

## Getting started

```bash
npm install
npm run dev
```

Sign-in goes through UnifiedAPI's `/api/Login` (or an API key via `/api/Login/LogInByKey`) with the ERP's partner logins: a `BPCust` (shipper) account gets the Customer view, a `BPAgent` (courier) account the Agent view. Staff accounts are refused — they use the ERP web app.

## Project structure

```
src/
  auth/            AuthContext, ProtectedRoute, NAV_ACCESS role config
  features/
    auth/          Login page
    customer/      Customer routes, layout, pages
    agent/         Agent routes, layout, pages (manifest, scans, COD)
  components/      Shared UI (NavBar)
  lib/             scanQueue.ts (IndexedDB) + sync hook
```

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`. Enable Pages for this repo under **Settings → Pages → Source: GitHub Actions** — no other setup needed.

The app is served from the custom domain **shipapp.cashgearerp.com** (configured under **Settings → Pages → Custom domain**), so `vite.config.ts` uses `base: "/"` and `public/CNAME` pins the domain so it survives each Pages deployment. `scripts/copy-spa-fallback.mjs` copies `index.html` to `404.html` after build so client-side routes survive a hard refresh on Pages (which has no server-side rewrite rules).

## Open decisions (from CLAUDE.md — not yet settled)

- Auth flow for Customer: phone-based OTP vs the current partner login (Agent = `BPAgent` courier accounts, settled)
- POD photo capture: required or optional per delivery
- Barcode decode library (`zxing-js` vs `html5-qrcode`)
- Static hosting: currently wired for **GitHub Pages**; Azure Static Web Apps was the other option under consideration
