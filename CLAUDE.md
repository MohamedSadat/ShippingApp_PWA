# Shipping App — Customer & Agent PWA

## Project Overview

Client-facing PWA for CashGearERP's shipping/3PL system, serving two roles in a single app:

- **Customer** — track shipments, view waybill/COD status, receive status update notifications
- **Agent** — scan pickup/delivery waybills, manage COD collection, view assigned manifest

This is a browser-installable PWA, not a native app. It replaces what would otherwise have been extra scope on the existing MAUI mobile app — chosen specifically to avoid native app-store signing/provisioning CI/CD overhead, since the underlying MAUI app is still small and this workflow doesn't need it.

## Tech Stack

- Vite + React (same pattern as the existing `CGBoard` dashboard)
- Recharts if any charts are needed (agent stats, delivery history)
- Mobile-first CSS — design for phone width first, scale up for desktop/tablet
- Deployed as a PWA: web app manifest + service worker for installability and offline app-shell caching

## Architecture

- **Role-gated routing**, same pattern as CGBoard's `NAV_ACCESS` config — one app, two role-based view sets, gated off the authenticated user's role rather than separate apps/deployments
- **Backend**: existing `UnifiedAPI` (ASP.NET Core, API key auth, multi-tenant EF Core) — no new backend logic; this app is purely a new frontend client, same as CGBoard
- **CI/CD**: GitHub Actions → static hosting (GitHub Pages or Azure Static Web Apps — TBD), same build/deploy pattern already proven with CGBoard

## Key Decisions From Planning

These were deliberately decided against native (MAUI) after weighing trade-offs — don't relitigate without a real reason:

1. **No continuous/background location tracking** (not required near-term). Location is only captured at discrete action moments (pickup scan, delivery scan) via a one-time `navigator.geolocation.getCurrentPosition()` call at time of scan. This works identically on iOS/Android PWA — no native advantage here, so no reason to reconsider unless live agent tracking becomes a real product requirement later.
2. **Barcode/waybill scanning** via camera `getUserMedia` + `@zxing/browser` for QR decode (waybill labels are QR codes). Android Chrome uses the native `BarcodeDetector` API when available for lower CPU cost; iOS Safari and other browsers fall back to `@zxing/browser` — works fine, just slightly heavier. Implemented as a reusable `BarcodeScanner` component (`src/components/BarcodeScanner.tsx`) used by both Pickup and Delivery scan pages; manual paste/typing remains the default fallback input.
3. **Push notifications** for customer shipment status updates: supported on Android in any context; on iOS, push only works if the customer has installed the PWA to their home screen first (iOS 16.4+ requirement) — design the install prompt into the flow accordingly.

## Offline Handling (Agent-critical)

Agents will be scanning in low-signal areas. Design for this from day one, not as a bolt-on:

- Scan events (barcode + timestamp + location + POD photo if used) get written to **IndexedDB** immediately on scan, regardless of connectivity
- A sync queue flushes to the API when back online
- **Important constraint**: iOS Safari does not support the Background Sync API, so the queue cannot silently flush in the background. Flush must be triggered on app-foreground / online events — acceptable for this workflow since an agent reopens the app for the next scan anyway, but don't design the UX assuming silent background sync will happen.

## Open Decisions (not yet settled)

- Static hosting target: GitHub Pages vs Azure Static Web Apps
- POD (proof of delivery) photo capture — required per delivery, or optional?
- Auth flow for Customer role (likely phone-number-based, consistent with existing CashGear customer identity pattern) vs Agent role (likely tied to existing staff/agent accounts)

## Non-Goals (for now)

- Live/continuous agent location tracking on a map
- Native app store distribution for this specific app
- Offline *write* beyond the scan-queue pattern above (i.e. not a full offline-first data sync engine)
