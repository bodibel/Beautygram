# GlowySpot Guard Consolidation Report

Date: 2026-05-29

Scope: Phase 1B guard consolidation, active-user enforcement and mutation ownership audit. No production VPS access and no Prisma migration was performed.

## Active-user enforcement

| Area | Files | Current enforcement | Risk reduced | Remaining work | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Central server guard | `lib/auth-utils.ts` | `getActiveSessionUser`, `requireActiveSessionUser`, `requireSession`, `requireAdminSession` now verify the DB user exists and `isActive === true`. | Disabled users with old JWT sessions cannot use guarded layouts/actions. | Add explicit tests with inactive-user fixtures. | P0 | Yes |
| Dashboard layout | `app/dashboard/layout.tsx` | Uses `getActiveSessionUser`; inactive or logged-out users redirect to `/`. | Old inactive sessions cannot enter dashboard pages. | Preserve intended post-login destination in Phase 2. | P1 | No |
| Salon console layout | `app/salon/[id]/layout.tsx` | Uses `getActiveSessionUser` and owner check. | Inactive owners cannot enter salon console. | Decide admin bypass policy separately. | P1 | No |
| Upload API | `app/api/upload/route.ts` | Uses `getActiveSessionUser` before upload rate limit and image processing. | Inactive users cannot upload media. | Add integration test with inactive session mock. | P1 | No |
| Admin actions | `lib/actions/user.ts`, `lib/actions/category.ts` | Admin helpers use `requireAdminSession`. | Inactive admin sessions are blocked before admin mutations. | Add admin role fixtures. | P1 | No |

## Ownership guard audit

| Mutation group | Files/functions | Guard currently used | Status | Recommendation |
| --- | --- | --- | --- | --- |
| Salon read/write console | `getSalonData`, `updateSalon`, `getUserSalons` in `lib/actions/salon.ts` | `requireSelf` or `requireSalonOwner`; both now depend on active `requireSession`. | Good baseline. | Keep helper pattern; add tests for cross-user access. |
| Salon create | `createSalon` | Active session plus ownerId self-check. Minimal required field validation added for name, address and currency. | Improved. | Add structured schema validation in Phase 2. |
| Service create/edit/delete | `createService`, `updateService`, `deleteService` | `requireSalonOwner` / `requireServiceOwner`; minimal name/price/duration validation added. | Improved. | Add reusable service policy tests. |
| Post/gallery | `createPost`, `updatePost`, `deletePost` | `requireSalonOwner` / `requirePostOwner`; subscription post limit exists on create. | Partial. | Add content/image validation and upload ownership model in Phase 2. |
| Booking visitor actions | `createBooking`, `getMyBookings`, `cancelMyBooking` | Active session, self-check, booking policy helpers, ownership check on cancel. | Good baseline. | Add DB-backed integration tests. |
| Booking provider actions | `getSalonBookingRequests`, `acceptBookingRequest`, `rejectBookingRequest` | `requireSalonOwner`, ownership check through booking's salon owner, booking status policy. | Good baseline. | Add race-condition test for accept conflict. |
| Message actions | `sendMessage`, `getUserMessages`, `markMessageAsRead`, `getUnreadMessageCount` | Active session sender/receiver ownership checks; non-empty message content validation added. | Improved. | Validate receiver/salon relationship in Phase 2. |
| Favorite/like/comment | `toggleFavorite`, `toggleLike`, `addComment` | Active session self-check; comment now rejects empty text. | Improved. | Validate target salon/post existence before mutation in Phase 2. |
| Review | `createReview` | Active session self-check; rating range and non-empty comment validation added. | Improved. | Prevent duplicate reviews if product requires one review per booking/salon. |
| Admin user/category | `lib/actions/user.ts`, `lib/actions/category.ts` | `requireAdminSession`; role policy helpers protect last admin cases. | Good baseline. | Add admin fixture tests and audit logging later. |

## Profile/account consolidation

| Route | Decision | Files |
| --- | --- | --- |
| `/dashboard/account` | Added as canonical dashboard account entry. | `app/dashboard/account/page.tsx` |
| `/dashboard/profile` | Redirects to `/dashboard/account`. | `app/dashboard/profile/page.tsx` |
| `/profile/me` | Kept as legacy/public profile entry for now to avoid larger route refactor. | `app/profile/me/page.tsx` |

Phase 2 recommendation: move the shared account UI out of `app/profile/me/page.tsx` into a component and then redirect `/profile/me` to `/dashboard/account` for logged-in users.

## MVP-safe skeleton parking

| Feature | Change | Files | Status |
| --- | --- | --- | --- |
| Subscription/payment | Removed from provider nav and replaced the page with a read-only "hamarosan" MVP-safe state. No Stripe/payment action is triggered. | `lib/navigation-config.ts`, `app/dashboard/subscription/page.tsx` | Parked |
| Maps | Public bottom nav still exposes disabled map affordance only. No map feature was built. | `components/navigation/public-bottom-nav.tsx` | Parked |
| Analytics/stat widgets | Not fully removed in Phase 1B to avoid wider dashboard redesign. | Dashboard components | Phase 2 |

## Validation performed

After each implementation unit:

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`

Final checks are recorded in the Phase 1B completion report.
