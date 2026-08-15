# GlowySpot MVP Test Matrix

Audit date: 2026-05-29

## Existing Automated Tests

| Test file | Coverage | Status |
| --- | --- | --- |
| `tests/auth/role-policy.test.ts` | Admin role safety policy. | Good unit baseline. |
| `tests/booking/booking-policy.test.ts` | Booking status/date/time policy and messages. | Good unit baseline, but encodes mojibake expectations. |
| `tests/geo/distance.test.ts` | Distance/radius helpers. | Good utility baseline. |

Current gap: no integration tests, no API route tests, no Server Action integration tests, no Playwright/e2e smoke tests.

## Mandatory MVP Smoke Flows

| Flow | Steps | Expected result | Files touched by flow | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- |
| Registration | Open auth modal, register visitor with new email/password. | User exists, session starts or login works after registration. | `auth-modal.tsx`, `lib/actions/auth.ts`, `lib/auth-options.ts` | P1 | Yes |
| Login/logout | Login credentials, logout. | Protected routes available after login and blocked after logout. | `auth-modal.tsx`, `proxy.ts`, dashboard layout | P1 | Yes |
| Visitor dashboard access | Visit `/dashboard`. | Redirect if logged out; dashboard if logged in. | `app/dashboard/layout.tsx`, `app/dashboard/page.tsx` | P1 | Yes |
| Provider onboarding | Visitor clicks create salon. | Salon creation flow opens and completes. | `app/dashboard/salons/page.tsx`, `SalonWizard`, `createSalon` | P1 | Yes |
| Salon creation | Submit valid salon with address/category. | Salon row, subscription row, slug created; redirect/open console. | `createSalon`, `lib/slug.ts`, `lib/subscription.ts` | P1 | Yes |
| Salon edit | Edit basic profile/settings. | Only owner can update; public profile reflects changes. | `app/salon/[id]/settings`, `updateSalon` | P1 | Yes |
| Service creation | Add service. | Service appears in salon console and public profile. | `services/page.tsx`, `createService` | P1 | Yes |
| Image upload | Upload valid image. | WebP saved, returned via `/api/files/:filename`, shown on page. | `app/api/upload`, `app/api/files`, `lib/upload` | P1 | Yes |
| Public salon page | Open `/profile/:slug`. | Services, images, hours, reviews render without errors. | `app/profile/[slug]`, `components/salon-page/*` | P1 | Yes |
| Booking request create | Visitor requests booking. | Pending booking row created; provider can see it. | `BookingRequestModal`, `createBooking` | P1 | Yes |
| Provider accept/reject | Provider accepts/rejects pending booking. | Status changes and visitor message created. | `BookingRequests`, `acceptBookingRequest`, `rejectBookingRequest` | P1 | Yes |
| Visitor status refresh | Visitor opens `/dashboard/bookings`. | Updated booking status visible. | `getMyBookings`, `dashboard/bookings` | P1 | Yes |
| Unauthorized salon access | User B opens User A salon console route. | Blocked/redirected; no data mutation possible. | `proxy.ts`, salon layout/actions | P1 | Yes |
| Admin access | Non-admin opens `/dashboard/admin/overview`; admin opens it. | Non-admin redirected; admin sees UI. | `proxy.ts`, admin pages/actions | P1 | Yes |
| Mobile basic | Run flows on mobile viewport. | Nav usable, buttons visible, no content overlap. | layout/nav components | P1 | Yes |

## Suggested Automated Test Layers

### Unit Tests

Add:

- `upload-policy.test.ts`: allowed MIME, max size, filename policy.
- `salon-policy.test.ts`: owner-only assumptions if extracted.
- `review-policy.test.ts`: rating range, self-review, duplicate-review decision.
- `auth-validation.test.ts`: public role and password/email validation.

### Integration Tests

Add with test DB or mocked Prisma:

- Registration creates visitor only.
- Admin cannot remove last admin.
- Create salon creates subscription and unique slug.
- Booking request rejects invalid service/salon mismatch.
- Provider cannot accept booking for another salon.
- User cannot read another user's favorites/messages.

### E2E Tests

Recommended Playwright smoke suite:

1. `auth.spec.ts`: register/login/logout/protected route.
2. `salon-onboarding.spec.ts`: create salon and service.
3. `public-discovery.spec.ts`: providers listing and public salon page.
4. `booking.spec.ts`: visitor request, provider accept/reject, visitor sees status.
5. `authorization.spec.ts`: cross-user and non-admin blocks.
6. `mobile.spec.ts`: dashboard and booking flow at mobile viewport.

## Manual Dev VPS Checklist

Run on `https://dev.glowyspot.com` after each release candidate:

- Homepage loads without console-visible crash.
- `/providers` loads and filters do not crash.
- Public salon profile loads for a seeded or manually created salon.
- Auth modal works for credentials.
- Dashboard redirect works logged-out/logged-in.
- Salon console owner-only routes work.
- Upload works with small JPG/PNG and rejects invalid file after hardening.
- Booking request works end-to-end.
- Admin user/category pages load for admin only.
- Mobile nav works on 390px width.

## Current Test Risks

| Risk | Files | Problem | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- |
| No e2e coverage | Whole app | Critical user flows can regress silently. | Add Playwright MVP smoke before prod. | P1 | Yes |
| Tests expect mojibake | `tests/booking/booking-policy.test.ts` | Encoding bug is baked into assertions. | Fix text and tests together. | P1 | No |
| No DB-backed integration tests | `lib/actions/*` | Ownership checks not fully proven. | Add test DB or action-level integration suite. | P1 | Yes |
| No upload tests | `app/api/upload` | Security behavior untested. | Add policy + API tests. | P1 | Yes |
| No route guard tests | `proxy.ts`, layouts | Next proxy changes are security-sensitive. | Add e2e route guard matrix. | P0 | Yes |
