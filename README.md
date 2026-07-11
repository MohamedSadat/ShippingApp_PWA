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

There's no real backend auth wired up yet (see Open Decisions below) — the login screen at `/` is a role picker that stores a mock user in `localStorage` so the gated routing/layouts can be exercised end to end.

## Project structure

```
src/
  auth/            AuthContext, ProtectedRoute, NAV_ACCESS role config
  features/
    auth/          Login / role-select page (placeholder)
    customer/      Customer routes, layout, pages
    agent/         Agent routes, layout, pages (manifest, scans, COD)
  components/      Shared UI (NavBar)
  lib/             scanQueue.ts (IndexedDB) + sync hook
```

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`. Enable Pages for this repo under **Settings → Pages → Source: GitHub Actions** — no other setup needed.

`vite.config.ts` derives the base path from `GITHUB_REPOSITORY` at build time, so it doesn't need the repo name hardcoded. `scripts/copy-spa-fallback.mjs` copies `index.html` to `404.html` after build so client-side routes survive a hard refresh on Pages (which has no server-side rewrite rules).

## Open decisions (from CLAUDE.md — not yet settled)

- Real auth flow: phone-based OTP for Customer vs staff-account for Agent, against `UnifiedAPI`
- POD photo capture: required or optional per delivery
- Barcode decode library (`zxing-js` vs `html5-qrcode`)
- Static hosting: currently wired for **GitHub Pages**; Azure Static Web Apps was the other option under consideration
