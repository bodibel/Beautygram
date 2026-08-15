# GlowySpot Phase 2A Dashboard Restructure Report

Date: 2026-05-29

Scope: dashboard app-code, route, nav and UX cleanup only. No Prisma schema change, no migration, no production VPS work.

## Modified Files

- `app/dashboard/page.tsx`
- `app/dashboard/provider/page.tsx`
- `app/dashboard/salons/page.tsx`
- `app/dashboard/comments/page.tsx`
- `lib/navigation-config.ts`
- `components/layout/sidebar.tsx`
- `tests/navigation/navigation-config.test.ts`

## New Or Changed Routes

| Route | Status | Purpose |
| --- | --- | --- |
| `/dashboard` | Restructured | Visitor/account overview only: bookings, unread messages, favorites and role-aware CTA. |
| `/dashboard/provider` | Added | Provider summary with owned salons, pending booking request count and onboarding empty state. |
| `/dashboard/salons` | Cleaned | Clear "Szalonjaim" list/onboarding page with create salon CTA and salon console entry. |
| `/dashboard/comments` | Redirected | Redirects to `/dashboard/messages`; comments are not MVP-critical as a separate dashboard area. |
| `/dashboard/profile` | Unchanged from Phase 1B | Continues redirecting to `/dashboard/account`. |
| `/dashboard/subscription` | Unchanged from Phase 1B | Remains read-only "hamarosan" state and is hidden from provider nav. |

## Redirects

- `/dashboard/profile` -> `/dashboard/account`
- `/dashboard/comments` -> `/dashboard/messages`

## Visitor Dashboard Final State

`/dashboard` no longer presents itself as a provider/salon operations panel.

It shows:

- booking count and recent booking statuses,
- unread message count and latest messages,
- favorite count and favorite empty state,
- provider users see a CTA to `/dashboard/provider`,
- visitor users see a soft CTA to create a salon if relevant.

## Provider Dashboard Final State

`/dashboard/provider` is the provider-level starting point.

It shows:

- owned salon count,
- pending booking request summary,
- total review count,
- cards for each owned salon,
- quick entry to the existing salon console at `/salon/[id]`,
- onboarding empty state when no salon exists.

No new data model was introduced. Existing actions are used:

- `getUserSalons`
- `getSalonBookingRequests`

## Navigation Changes

Central config in `lib/navigation-config.ts` now separates:

- visitor/public links,
- authenticated visitor/account links,
- provider links,
- admin links,
- salon console links.

Important active-state rules:

- `/dashboard` is exact.
- `/dashboard/provider` is prefix.
- `/dashboard/salons` is prefix.
- `/dashboard/admin/overview` is exact.

`components/layout/sidebar.tsx` now uses `getNavLinks(...)` instead of local ad hoc role branching for dashboard links.

## Skeleton And Placeholder Cleanup

- Subscription/payment remains parked as read-only and is not in provider nav.
- Comments route no longer exposes a separate half-feature dashboard card.
- No Stripe/payment/map/realtime availability feature was added.
- Old `/salon/[id]/*` console routes were left intact to avoid breaking existing provider workflows.

## What Was Not Modified

- `prisma/schema.prisma`
- `prisma/migrations/*`
- production VPS
- database structure
- old `/salon/[id]/*` console implementation
- admin dashboard IA beyond nav config inclusion
- payment/subscription implementation
- map or availability functionality

## Tests

Added:

- `tests/navigation/navigation-config.test.ts`

Covered:

- exact `/dashboard` active state,
- prefix `/dashboard/provider`,
- prefix `/dashboard/salons`,
- exact `/dashboard/admin/overview`,
- visitor/provider nav separation.

## Verification

Intermediate checks passed after each major step:

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`

Final build should be recorded in the completion response.

## Phase 2B Remaining Work

- Move salon console from `/salon/[id]/*` toward `/dashboard/salons/[salonId]/*` with redirects.
- Add role-aware mobile bottom nav for provider users if needed.
- Extract dashboard data loading away from client-side Server Action calls if performance becomes an issue.
- Replace remaining generic analytics/stat widgets with real MVP-backed summaries or hide them.
- Add Playwright route smoke for visitor/provider/admin dashboard paths.
- Create reusable dashboard shell components once IA is stable.

## Suggested Next Prompt

```text
Kérlek folytasd a GlowySpot Phase 2B munkát: készíts elő salon console route aliasokat `/dashboard/salons/[salonId]/*` alatt a meglévő `/salon/[id]/*` törése nélkül, adj hozzá redirect/compatibility tervet, és készíts Playwright route smoke tervet visitor/provider/admin dashboard utakra. Ne módosíts Prisma schema-t és ne futtass migrationt.
```
