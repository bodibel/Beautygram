# GlowySpot MVP Scope

Audit date: 2026-05-29

Goal: define the smallest coherent GlowySpot version that can be tested with real visitors and beauty providers.

## MVP Product Definition

The MVP is not a full marketplace. It is a trustable salon discovery and appointment-request platform where:

- Visitors can register/login, discover active salons, view real salon profiles, favorite salons, send messages, request appointments, and track request status.
- Providers can create one or more salons, publish core salon data, services, images/posts, opening hours, handle appointment requests, and message visitors.
- Admins can manage users and categories enough to keep the platform usable during early testing.

## MVP Mandatory

| Feature | Files | Current status | Problem | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Auth: visitor registration/login/logout | `components/auth/auth-modal.tsx`, `lib/actions/auth.ts`, `lib/auth-options.ts` | Partial | Works conceptually, but validation/copy/demo UI need cleanup. | Keep credentials + Google if callbacks verified; remove demo shortcuts. | P1 | Yes |
| Route protection | `proxy.ts`, `app/dashboard/layout.tsx`, `app/salon/[id]/layout.tsx` | Partial | Depends on vulnerable Next version. | Upgrade Next in controlled Phase 1 and smoke-test guards. | P0 | Yes |
| Public salon listing | `app/providers/page.tsx`, `components/search/*`, `getAllSalons` | Partial | Real data, but filters and empty states need QA. | Keep simple list/search; postpone map. | P1 | Yes |
| Public salon profile | `app/profile/[slug]/page.tsx`, `components/salon-page/*` | MVP-near | Real profile, services, reviews, posts. | Keep as primary public surface; fix encoding/SEO. | P1 | Yes |
| Provider onboarding/salon creation | `app/dashboard/salons/page.tsx`, `components/wizard/SalonWizard.tsx`, `createSalon` | MVP-near | Role upgrade flow unclear. | Visitor can create salon; after success route to salon console. | P1 | Yes |
| Salon edit basics | `app/salon/[id]/settings/page.tsx`, `services/page.tsx`, `hours/page.tsx`, `team/page.tsx` | Partial | Too many routes and overlapping settings. | Keep basics: data, services, hours, gallery/portfolio. | P1 | Yes |
| Upload image | `app/api/upload/route.ts`, `lib/upload.ts` | Partial | No hard size/rate limits. | Add strict MVP upload policy before real users. | P1 | Yes |
| Booking request | `BookingRequestModal`, `createBooking`, `BookingRequests` | MVP-near | No true availability engine. | Keep request-only wording; validate date/time and ownership. | P1 | Yes |
| Provider accept/reject | `acceptBookingRequest`, `rejectBookingRequest`, `booking-requests.tsx` | MVP-near | Needs smoke/e2e coverage. | Keep as central MVP flow. | P1 | Yes |
| Visitor booking status | `app/dashboard/bookings/page.tsx`, `getMyBookings` | MVP-near | UI copy encoding broken. | Keep and test. | P1 | Yes |
| Messages | `app/dashboard/messages/page.tsx`, `sendMessage`, `getUserMessages` | Partial | Thread UX heavy; admin fallback awkward. | Keep simple visitor-provider threads. | P2 | No |
| Favorites | `app/dashboard/favorites/page.tsx`, favorite actions | MVP-ready partial | Encoding/UI polish. | Keep. | P2 | No |
| Admin user/category management | `app/dashboard/admin/*`, `components/admin/*`, `lib/actions/user.ts`, `lib/actions/category.ts` | Partial | Enough for MVP ops, not moderation platform. | Keep minimal admin. | P2 | No |

## MVP After

| Feature | Why after MVP | Files |
| --- | --- | --- |
| Full map search | Requires better geocoding, privacy, UI, and performance validation. | `components/search/*`, `GoogleMapsProvider`, places hooks |
| Advanced analytics | Current widgets are not reliable business metrics. | `components/dashboard/kpi-cards.tsx`, dashboard overview |
| Subscription payment | Plan logic exists but Stripe/payment is not complete. | `app/dashboard/subscription/page.tsx`, `lib/subscription.ts` |
| Email notification automation | Resend exists, but event-driven email behavior needs policy and tests. | `lib/mail.ts`, booking/message actions |
| Review moderation | Reviews exist, but abuse/reporting workflow is missing. | `Review`, admin area |
| Public SEO program | Needs server-side data and canonical strategy after UX stabilizes. | `app/layout.tsx`, public pages |

## Later Version

| Feature | Reason |
| --- | --- |
| Real-time calendar availability | Requires slot engine, provider schedule exceptions, collision logic, and UX for reschedule/cancel. |
| Online payment/deposit | Needs legal/payment/Stripe webhook lifecycle. |
| Premium ranking/featured marketplace | Requires payment and admin moderation. |
| Report abuse queue | Important, but can follow controlled MVP if admin has manual DB/user tools. |
| Multi-language/i18n | Needed later; first fix Hungarian encoding and copy. |
| AI-enhanced moderation beyond upload | Useful later, but do not make MVP depend on AI availability. |

## Park Or Remove For MVP

| Item | Files | Decision | Reason | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- |
| Demo account quick buttons | `components/auth/auth-modal.tsx` | Remove before MVP test | Looks internal and weakens trust. | P1 | Yes |
| Duplicate `Profil` vs `Szalonom` dashboard concepts | `app/profile/me/page.tsx`, `app/dashboard/profile/page.tsx`, `app/dashboard/salons/page.tsx` | Merge/redirect | Confuses visitor/provider model. | P1 | Yes |
| `app/dashboard/comments/page.tsx` | `app/dashboard/comments/page.tsx` | Park/redirect | Not central to MVP and not in nav scope. | P2 | No |
| Advanced subscription UI | `app/dashboard/subscription/page.tsx` | Park as read-only plan info | Payment not ready. | P2 | No |
| Before/after teaser | `components/inspiration/before-after-teaser.tsx` | Keep only as non-blocking content | No real data yet. | P3 | No |
| Availability teaser | `components/inspiration/availability-teaser.tsx` | Clarify request-only | Avoid implying instant booking. | P2 | No |

## MVP Acceptance Criteria

- Fresh visitor can register, login, browse salons, view profile, favorite salon, send message, request booking.
- Provider can create salon, add service, add image/post, set hours, see booking request, accept/reject.
- Visitor sees changed booking status.
- Unauthorized user cannot access `/dashboard`, `/salon/:id`, another user's data, or another salon's console.
- Admin can list users and categories.
- Dev and prod envs stay isolated.
- Smoke tests pass on local and dev VPS.
- No P0 security or migration blocker remains.
