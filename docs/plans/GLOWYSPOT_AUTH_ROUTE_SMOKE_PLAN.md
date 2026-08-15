# GlowySpot Auth Route Smoke Plan

Date: 2026-05-29

Scope: Phase 1C route guard smoke matrix. This document complements the mocked Vitest proxy tests and does not replace Playwright/e2e validation.

## Automated coverage already added

File: `tests/auth/proxy-route-guard.test.ts`

Mocked proxy unit tests cover:

| Flow | Automated status | Expected result |
| --- | --- | --- |
| Logged-out `/dashboard` | Covered with mocked `getToken(null)` | Redirect to `/?authRequired=true` |
| Visitor `/dashboard` | Covered with mocked visitor token | Allowed |
| Visitor `/dashboard/admin/overview` | Covered with mocked visitor token | Redirect to `/dashboard?forbidden=true` |
| Admin `/dashboard/admin/overview` | Covered with mocked admin token | Allowed |
| Provider `/salon/:id` proxy gate | Covered with mocked provider token | Allowed by proxy |
| Admin `/salon/:id` proxy gate | Covered with mocked admin token | Allowed by proxy |
| Visitor `/salon/:id` proxy gate | Covered with mocked visitor token | Redirect to `/dashboard?forbidden=true` |

Important limitation: these are proxy decision tests only. They do not prove browser cookies, NextAuth session renewal, DB user state, or page-level ownership behavior.

## Manual/Playwright smoke matrix

### Fixtures needed

| Fixture | Required data |
| --- | --- |
| `visitorActive` | Active user with role `visitor` |
| `providerOwner` | Active user with role `provider`, owns `salonOwnedByProvider` |
| `providerOther` | Active user with role `provider`, does not own `salonOwnedByProvider` |
| `adminActive` | Active user with role `admin` |
| `inactiveUser` | `isActive=false`, any role |
| `salonOwnedByProvider` | Salon with `ownerId=providerOwner.id` |

### Browser route checks

| Flow | Steps | Expected |
| --- | --- | --- |
| Logged-out dashboard | Clear cookies, visit `/dashboard` | Redirects to `/` with `authRequired=true` |
| Visitor dashboard | Login as `visitorActive`, visit `/dashboard` | Page loads, no forbidden redirect |
| Visitor admin route | Login as `visitorActive`, visit `/dashboard/admin/overview` | Redirects to `/dashboard?forbidden=true` |
| Provider own salon console | Login as `providerOwner`, visit `/salon/{salonOwnedByProvider.id}` | Page loads |
| Provider other salon console | Login as `providerOther`, visit `/salon/{salonOwnedByProvider.id}` | Redirects to `/dashboard/salons` |
| Visitor salon console | Login as `visitorActive`, visit `/salon/{salonOwnedByProvider.id}` | Redirects to `/dashboard?forbidden=true` at proxy |
| Admin admin overview | Login as `adminActive`, visit `/dashboard/admin/overview` | Page loads |
| Inactive dashboard | Force session for `inactiveUser`, visit `/dashboard` | Redirects to `/` |
| Inactive upload | Force session for `inactiveUser`, POST `/api/upload` | `401` |

## Recommended Playwright implementation

1. Add a dedicated auth fixture helper that can create session cookies or log in via credentials.
2. Seed or restore a local test DB snapshot with the fixture rows above.
3. Run route checks against a local dev server.
4. Keep assertions route-level and simple: status/URL/page marker, not visual layout.

## Deferred until DB reconciliation

- Real DB-backed provider ownership route checks.
- Inactive session behavior after user status changes while JWT is still present.
- Upload route with real authenticated inactive session.
