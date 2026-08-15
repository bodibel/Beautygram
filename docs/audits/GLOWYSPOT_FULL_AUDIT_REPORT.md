# GlowySpot Full MVP Completion Audit

Audit date: 2026-05-29

Scope: local working tree at `C:\Dev\Glowyspot`, GitHub `origin/main`, VPS production `/opt/projects/glowyspot`, VPS development `/opt/projects/glowyspot-next`.

Constraints followed: no code fixes, no dependency upgrades, no Prisma migration execution, no production deploy/action. Documentation files only.

## Executive Status

Estimated MVP readiness: 62%.

The app has a real foundation: Next.js App Router, NextAuth, Prisma/Postgres, salon CRUD, public discovery, visitor dashboard, provider salon console, booking requests, messages, favorites, categories, uploads, and admin user/category management. The MVP is not yet stable because the working tree is heavily ahead of GitHub main, migration history is inconsistent between environments, dashboard information architecture is tangled, dependency audit has high-severity findings, and user-facing Hungarian text has widespread mojibake.

## Environment And Version State

### GitHub

Current `origin/main`: `35922ecf200684e6fe7cff14ca62684df4668883` (`chore: bump version to 1.3.0`).

Local branch: `main`.

Local `HEAD`: `35922ecf200684e6fe7cff14ca62684df4668883`.

Local commit and GitHub main are aligned at commit level, but the working tree is not clean. The local workspace contains the active MVP work and is materially ahead of GitHub.

Changed since `origin/main`:

- 83 tracked files modified/deleted.
- Major modified areas: `app/api`, `app/dashboard`, `app/profile/[slug]`, `app/providers`, `app/salon/[id]`, `components/layout`, `components/dashboard`, `components/salon`, `lib/actions`, `lib/auth-*`, `lib/navigation-config`, `package.json`, `package-lock.json`, `next.config.ts`.
- Deleted: `middleware.ts`.
- Added/untracked MVP areas: `proxy.ts`, `lib/auth-options.ts`, `lib/auth/`, `lib/booking/`, `lib/geo/`, `app/dashboard/bookings/`, `app/dashboard/create-salon/`, `app/dashboard/profile/`, `app/salon/[id]/bookings/`, `app/salon/[id]/reviews/`, `components/salon-page/`, `components/search/`, `components/inspiration/`, `tests/`, `types/next-auth.d.ts`, `public/images/hero/search-hero-beauty.png`.
- Untracked local runtime/noise: `.codex-logs/`, `.superpowers/`, `dev-server.log`, `dev-server.err.log`, `test-results/`.

Stable-looking local changes:

- `lib/auth-options.ts`: NextAuth config extracted from route.
- `proxy.ts`: route protection migrated to Next.js 16 proxy model.
- `lib/auth/role-policy.ts`: admin role safety policy exists and is unit-tested.
- `lib/booking/booking-policy.ts`: booking status rules exist and are unit-tested.
- `tests/auth`, `tests/booking`, `tests/geo`: focused unit tests exist.
- `components/salon-page/*`: public salon profile has more complete booking/review/service presentation.
- `app/dashboard/bookings/page.tsx` and `app/salon/[id]/bookings/page.tsx`: booking request flow exists.

Risky or partial local changes:

- `package-lock.json`: recently corrected for Linux/Alpine `npm ci`, but large lockfile drift should be reviewed and committed intentionally.
- `proxy.ts` replaces `middleware.ts`; because dependency audit includes Next proxy/middleware bypass advisories, this is a P0 security-sensitive area.
- Dashboard nav is split across `lib/navigation-config.ts`, `components/layout/sidebar.tsx`, `components/layout/bottom-nav.tsx`, and page-level layouts, causing active-state and role-context inconsistencies.
- `app/page.tsx`, `app/providers/page.tsx`, and `app/profile/[slug]/page.tsx` use client-side Server Action calls in public pages; functional, but loading/error states and SEO are partial.
- Mojibake appears in core files and tests, so current UI copy and emails are not production-quality.

## VPS Production

Path: `/opt/projects/glowyspot`

Domain: `glowyspot.com`

Containers:

- `glowyspot-web`: running, image `glowyspot-glowyspot-web`, exposes container port `3000`.
- `glowyspot-db`: running, image `postgres:15-alpine`, container port `5432`.

Compose/env structure:

- Compose file uses project-local `.env`.
- DB bind mount: `./data/postgres:/var/lib/postgresql/data`.
- Upload bind mount: `./public/uploads:/app/public/uploads`.
- App and DB share external `proxy_net`; DB is not publicly mapped.
- `NEXTAUTH_URL` is configured for `https://glowyspot.com`.
- `UPLOAD_DIR=/app/public`.

Current state:

- Running and untouched during this audit.
- DB name/user are production-specific (`glowyspot`, `glowyspot_user`).
- DB contains tables matching the older/prod shape: no `AuditLog`.
- `_prisma_migrations` contains:
  - `20260117222519_add_category_model`
  - `20260118104042_add_contact_preferences`
  - `20260118110618_add_granular_notifications`

## VPS Development

Path: `/opt/projects/glowyspot-next`

Domain: `dev.glowyspot.com`

Containers:

- `glowyspot-next-web`: running, image `glowyspot-next-web`, exposes container port `3000`.
- `glowyspot-next-db`: running, image `postgres:15-alpine`, container port `5432`.

Compose/env structure:

- Compose file: `docker-compose.side-by-side.yml`.
- Code path: `/opt/projects/glowyspot-next/repo`.
- Env file: `.env.next`.
- DB bind mount: `./storage/postgres:/var/lib/postgresql/data`.
- Upload bind mount: `./storage/uploads:/app/public/uploads`.
- Internal network: `glowyspot_next_internal`.
- Public proxy network: `proxy_net` only attached to web service.
- `NEXTAUTH_URL=https://dev.glowyspot.com`.
- `UPLOAD_DIR=/app/public`.

Current state:

- Running and serving `https://dev.glowyspot.com`.
- DB name/user are development-specific (`glowyspot_next`, `glowyspot_next_user`).
- DB contains an extra `AuditLog` table.
- `_prisma_migrations` contains `20260422170000_authoritative_baseline`, while the local repo currently has the three production-style migrations.

## Dev/Prod Isolation Check

| Area | Finding | Risk | Priority | MVP blocker |
| --- | --- | --- | --- | --- |
| DB volume | Prod uses `/opt/projects/glowyspot/data/postgres`; dev uses `/opt/projects/glowyspot-next/storage/postgres`. | Good isolation. | P1 | No |
| Upload storage | Prod uses `/opt/projects/glowyspot/public/uploads`; dev uses `/opt/projects/glowyspot-next/storage/uploads`. | Good isolation. | P1 | No |
| Env files | Prod `.env`, dev `.env.next`. | Good isolation; values must stay uncommitted. | P1 | No |
| Domain/NextAuth URL | Prod points to `glowyspot.com`; dev points to `dev.glowyspot.com`. | Good isolation if OAuth providers include both callbacks. | P1 | Yes, if OAuth login fails |
| Cookie/session | NextAuth default cookie names likely overlap only by parent domain rules; prod/dev are separate hosts. | Verify cookie domain is not manually widened. | P1 | No |
| OAuth callback URLs | Google keys exist in both envs; callback URLs were not externally verified. | Login may fail in dev/prod if callbacks missing. | P1 | Yes |
| API keys | OpenAI/Resend/Google keys exist in envs. | Dev could send real emails/use real APIs unless test-mode conventions are added. | P1 | No |
| Metadata | `app/layout.tsx` and public metadata still reference production `https://glowyspot.com`. | Dev previews and SEO can point to prod. | P2 | No |

## Functional Module Audit

### Public Side

| Module | Files | Status | Backend/DB | Authz | Validation/Error handling | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Homepage | `app/page.tsx`, `components/inspiration/*` | Partial | Uses `getRecentPosts`, `getAllSalons`, `getCategories`. | Public. | Catch/log only, skeletons. | Real data, but client-side loading and mojibake. |
| Feed | `components/home/feed-card.tsx`, `post-card.tsx`, `post-detail-modal.tsx`, `lib/actions/salon.ts` | Partial | Recent posts/comments/likes exist. | Like/comment require session. | Weak content validation. | Feed is less central after inspiration redesign. |
| Search/listing | `app/providers/page.tsx`, `components/search/*` | Partial | Real salon/category DB data. | Public. | Client filtering mostly UI-side. | Needs empty states, mobile QA, location rules. |
| Public salon profile | `app/profile/[slug]/page.tsx`, `components/salon-page/*` | Partial/MVP-near | Uses salon/services/posts/reviews/opening hours. | Public with owner checks for review button only. | Not-found and loading exist. | Strong public MVP surface, but client fetch reduces SEO. |
| Services display | `components/salon-page/salon-services.tsx` | MVP-ready partial | Real `Service` model. | Public. | No price/duration schema validation at UI level. | Booking CTA exists. |
| Gallery/posts | `components/salon-page/salon-portfolio.tsx`, `app/salon/[id]/posts/page.tsx`, `gallery/page.tsx` | Partial | Real posts/images arrays. | Owner checks in server actions. | Upload path filtering exists in reads. | Image lifecycle/delete cleanup incomplete. |
| Review/rating | `components/salon-page/salon-reviews.tsx`, `components/profile/ReviewModal.tsx`, `createReview` | Partial | Real `Review` and salon aggregate update. | Requires logged-in user. | Rating range not strongly enforced server-side. | Prevent duplicate/self-review rules are missing. |
| Contact/booking CTA | `BookingRequestModal`, `MessageModal`, `createBooking`, `sendMessage` | Partial/MVP-near | Real Booking/Message rows. | Session and ownership checks exist. | Booking policy validates date/time/status. | Availability is request-based, not calendar-slot based. |
| SEO metadata | `app/layout.tsx`, `app/salon/[id]/metadata.ts` | Partial | Static/prod metadata. | N/A. | N/A. | Dev/prod URL and canonical strategy need cleanup. |

### Auth

| Module | Files | Status | Problem | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- |
| Registration | `components/auth/auth-modal.tsx`, `lib/actions/auth.ts` | Partial | Public role currently fixed to visitor in UI, server allows visitor/provider; password validation is minimal; no email verification. | P1 | Yes |
| Login/logout | `components/auth/auth-modal.tsx`, `lib/auth-options.ts` | MVP-ready partial | Credentials and Google configured; demo account autofill appears in UI. | P1 | Yes |
| Session | `lib/auth-options.ts`, `types/next-auth.d.ts` | Partial | JWT strategy with role in token; stale role risk until token refresh/update. | P1 | No |
| Role handling | `lib/auth/role-policy.ts`, `lib/actions/user.ts` | Partial | Admin safety rules exist, but role strings are DB strings, not enum. | P1 | No |
| Route protection | `proxy.ts`, `app/dashboard/layout.tsx`, `app/salon/[id]/layout.tsx` | Partial | Proxy protects `/dashboard` and `/salon`; Next advisory makes upgrade urgent. | P0 | Yes |

### Visitor Dashboard

| Module | Files | Status | Notes |
| --- | --- | --- | --- |
| Overview | `app/dashboard/page.tsx` | Partial | Real bookings/messages/favorites/salons, but mixes visitor and provider entrypoints. |
| Profile | `app/dashboard/profile/page.tsx`, `app/profile/me/page.tsx` | Partial | Duplicate profile concepts. Needs one account settings route. |
| Bookings | `app/dashboard/bookings/page.tsx` | MVP-near | Real cancellation flow for pending bookings. |
| Favorites | `app/dashboard/favorites/page.tsx` | MVP-ready partial | Real DB favorites, good empty state, but UI copy encoding broken. |
| Messages | `app/dashboard/messages/page.tsx` | Partial | Real messaging, but thread UX and admin fallback need simplification. |
| Notifications | `lib/notification-context.tsx` | Partial | Counts unread messages only; not a full notification system. |
| Nav | `lib/navigation-config.ts`, `sidebar.tsx`, `bottom-nav.tsx` | Partial | Active state and role separation are current UX blockers. |

### Provider / Salon Dashboard

| Module | Files | Status | Notes |
| --- | --- | --- | --- |
| Salon create | `app/dashboard/salons/page.tsx`, `components/wizard/SalonWizard.tsx`, `createSalon` | Partial/MVP-near | Real DB create, slug, subscription init, duplicate fingerprint. Needs role-transition clarity. |
| Salon edit | `app/salon/[id]/settings/page.tsx`, modals/cards | Partial | Owner checks exist in actions; UI split across many routes. |
| Services | `app/salon/[id]/services/page.tsx`, `ServiceModal`, service actions | MVP-near | Real CRUD with owner checks. |
| Upload/images | `app/api/upload/route.ts`, `lib/upload.ts`, gallery/posts pages | Partial | Auth required and WebP conversion; lacks size/rate/MIME hardening. |
| Posts/portfolio | `app/salon/[id]/posts/page.tsx`, `PostModal`, post actions | Partial | Plan limits exist; video logic placeholder. |
| Booking requests | `app/salon/[id]/bookings/page.tsx`, `components/dashboard/booking-requests.tsx` | MVP-near | Accept/reject flow exists; conflicts checked. |
| Availability/hours | `app/salon/[id]/hours/page.tsx`, `HoursModal` | Partial | Opening hours stored, but not used to validate booking slots. |
| Messages | `app/dashboard/messages/page.tsx` | Partial | Shared visitor/provider route. |
| Analytics | `components/dashboard/kpi-cards.tsx`, dashboard overview | Skeleton/partial | Not reliable MVP analytics. |
| Subscription | `app/dashboard/subscription/page.tsx`, `lib/subscription.ts` | Placeholder/partial | Plan logic exists, Stripe not integrated. |
| Settings/contact | `/settings`, `/contact`, settings modals | Partial | Duplicate settings concepts. |

### Admin

| Module | Files | Status | Notes |
| --- | --- | --- | --- |
| Admin UI | `app/dashboard/admin/*`, `components/admin/*` | Partial | Exists and route protected. |
| Admin permission | `proxy.ts`, `lib/actions/user.ts`, `lib/actions/category.ts` | Partial/MVP-near | Server-side admin checks exist for user/category actions. |
| User moderation | `UserManager`, `lib/actions/user.ts` | Partial | Activate/deactivate/delete/role changes with last-admin protection. |
| Salon moderation | Missing | Missing | No dedicated salon review/suspend/report queue. |
| Report handling | Missing | Missing | No model/UI. |
| Upload moderation | `app/api/upload/route.ts` | Partial | AI moderation on upload, no admin queue/log. |
| Featured/premium | `lib/subscription.ts`, `getFeaturedSalons` | Partial | Premium ranking exists; admin controls incomplete. |
| Platform settings | `CategoryManager`, `SubscriptionConfig` model | Partial | Category settings exist; subscription settings UI incomplete. |

## Key Findings

| ID | Priority | MVP blocker | Files | Problem | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | P0 | Yes | `package.json`, `package-lock.json`, `next.config.ts`, `proxy.ts` | `npm audit` reports high Next.js advisories including proxy/middleware bypass and RSC DoS. | Protected routes may be bypassable depending on exact advisory path. | Plan controlled Next upgrade first on dev, run full auth smoke tests. |
| F-002 | P0 | Yes | `prisma/schema.prisma`, `prisma/migrations/*`, VPS DBs | Local/prod/dev migration histories diverge; dev has `AuditLog`, local schema does not. | Future migration may fail or drop unexpected DB state. | Freeze migrations, introspect dev/prod, create reconciliation migration plan. |
| F-003 | P1 | Yes | `lib/navigation-config.ts`, `sidebar.tsx`, `bottom-nav.tsx`, `app/dashboard/*` | Visitor/provider/admin dashboard information architecture is mixed. | Users land in confusing flows; active state bug persists. | Restructure dashboard before polishing provider console. |
| F-004 | P1 | Yes | `lib/booking/booking-policy.ts`, `lib/actions/salon.ts`, `components/salon-page/booking-request-modal.tsx` | Booking is request-based but availability/hours are not enforced. | Users can request invalid times; providers get noisy requests. | MVP: clearly label as request-only and validate basic business hours if present. |
| F-005 | P1 | No | Many files, especially `lib/booking/booking-policy.ts`, `lib/actions/*`, `app/page.tsx` | Mojibake in Hungarian strings. | Bad UX, broken emails/tests, trust loss. | Run encoding audit/fix in one dedicated pass with tests. |
| F-006 | P1 | Yes | `app/api/upload/route.ts`, `lib/upload.ts` | Upload lacks file size/rate/MIME hard limits; AI moderation fail-open. | Abuse, storage exhaustion, unsafe content if AI call fails. | Add hard size/type limits and explicit fail-open/fail-closed product decision. |
| F-007 | P1 | No | `.env`, `.env.production.example`, VPS envs | Dev/prod env separation exists, but API keys may be live in dev. | Dev tests can send real emails/API calls. | Add dev-mode email/API policy and callback checklist. |
| F-008 | P2 | No | `app/layout.tsx`, `app/profile/[slug]/page.tsx`, `app/salon/[id]/metadata.ts` | Metadata/canonical strategy points toward production and public pages fetch client-side. | SEO previews and indexing are weak. | Move public salon data fetching server-side where practical; env-based site URL. |
| F-009 | P2 | No | `lib/actions/auth.ts`, `auth-modal.tsx` | Registration validation is hand-rolled/minimal; UI demo account autofill remains. | Weak password/email quality and unprofessional UX. | Add schema validation and remove demo affordances for MVP. |
| F-010 | P2 | No | `prisma/schema.prisma` | Missing indexes on common query fields: `Salon.slug`, `ownerId`, `isActive`, `Booking.userId/salonId/status/date`, `Message.receiverId/isRead`. | Slower DB as data grows. | Add indexes after migration reconciliation. |

## Current Verification

Previously verified in this workspace:

- `npm run typecheck`: passed.
- `npm run lint`: passed with baseline-browser-mapping warning.
- `npm run test:run`: 3 files, 28 tests passed.
- `npm run build`: passed.
- Local server currently runs at `http://localhost:3000`.
- Dev VPS `https://dev.glowyspot.com`: HTTP 200 after latest dev deploy.

## Overall Recommendation

Do not push to production yet. Treat the current local state as an MVP candidate branch that needs stabilization, migration reconciliation, dependency/security work, dashboard IA cleanup, and smoke/e2e testing before a stable dev release can be considered ready.
