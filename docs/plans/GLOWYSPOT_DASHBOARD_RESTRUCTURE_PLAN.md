# GlowySpot Dashboard Restructure Plan

Audit date: 2026-05-29

## Current Problem

The dashboard currently mixes visitor, provider, salon-console, and admin concepts:

- `app/dashboard/page.tsx` presents visitor metrics but also provider salon entrypoints.
- `lib/navigation-config.ts` has `authLinks`, `providerLinks`, `adminLinks`, and `getSalonLinks`, but `components/layout/sidebar.tsx` does not consistently use `getNavLinks`.
- `components/layout/bottom-nav.tsx` has its own nav logic and can disagree with sidebar.
- `app/profile/me/page.tsx` and `app/dashboard/profile/page.tsx` duplicate profile/account concepts.
- `app/dashboard/salons/page.tsx` is both onboarding and provider salon list.
- `app/salon/[id]/*` is the real salon console, but it lives outside `/dashboard`.
- Active state for `Áttekintés` is reported as sticky/incorrect on other pages.

## Proposed Final Structure

### Visitor Dashboard

Keep:

- `/dashboard` -> visitor home / account overview.
- `/dashboard/bookings` -> visitor booking requests and statuses.
- `/dashboard/messages` -> conversations.
- `/dashboard/favorites` -> saved salons.
- `/dashboard/account` -> account/profile settings.

Redirect/remove:

- `/dashboard/profile` -> redirect to `/dashboard/account`.
- `/profile/me` -> redirect to `/dashboard/account`.
- `/dashboard/comments` -> remove from MVP nav; redirect to `/dashboard`.
- `/dashboard/create-salon` -> redirect to `/dashboard/salons?create=1` or future `/provider/onboarding`.

Visitor nav labels:

- Áttekintés
- Foglalásaim
- Üzenetek
- Kedvencek
- Fiók

### Provider Dashboard

Provider-level routes:

- `/dashboard/provider` -> provider overview across salons.
- `/dashboard/salons` -> salon list + create salon CTA.
- `/dashboard/subscription` -> plan summary, read-only MVP.
- `/dashboard/account` -> same account settings.

Salon-console routes:

- `/dashboard/salons/[salonId]` -> salon overview.
- `/dashboard/salons/[salonId]/bookings`
- `/dashboard/salons/[salonId]/profile`
- `/dashboard/salons/[salonId]/services`
- `/dashboard/salons/[salonId]/portfolio`
- `/dashboard/salons/[salonId]/hours`
- `/dashboard/salons/[salonId]/team`
- `/dashboard/salons/[salonId]/messages` or reuse `/dashboard/messages?salon=...`

Transitional redirects:

- `/salon/[id]` -> `/dashboard/salons/[id]`
- `/salon/[id]/settings` -> `/dashboard/salons/[id]/profile`
- `/salon/[id]/posts` -> `/dashboard/salons/[id]/portfolio`
- `/salon/[id]/gallery` -> `/dashboard/salons/[id]/portfolio`
- `/salon/[id]/contact` -> merge into `/dashboard/salons/[id]/profile`
- `/salon/[id]/reviews` -> show read-only in overview or profile; not primary MVP nav.

Provider nav labels:

- Áttekintés
- Szalonjaim
- Előfizetés
- Fiók

Salon nav labels:

- Áttekintés
- Foglalási kérelmek
- Szalonprofil
- Szolgáltatások
- Portfólió
- Nyitvatartás
- Csapat
- Üzenetek

### Admin

Keep:

- `/dashboard/admin/overview`
- `/dashboard/admin/providers`
- `/dashboard/admin/visitors`
- `/dashboard/admin/settings`

Add after MVP:

- `/dashboard/admin/salons`
- `/dashboard/admin/reports`
- `/dashboard/admin/uploads`
- `/dashboard/admin/subscriptions`

Admin nav labels:

- Admin áttekintés
- Szolgáltatók
- Látogatók
- Kategóriák / Beállítások

## UX Logic

| Scenario | Destination | Notes |
| --- | --- | --- |
| Visitor logs in | `/dashboard` | Shows bookings, favorites, messages, CTA to create salon. |
| Provider logs in with no salon | `/dashboard/salons?create=1` or `/dashboard/provider` with onboarding empty state | Do not show empty operational dashboard. |
| Provider logs in with salon | `/dashboard/provider` | Shows salon cards and booking request summary. |
| Admin logs in | `/dashboard/admin/overview` | Avoid mixing admin with visitor dashboard. |
| Visitor creates first salon | Redirect to `/dashboard/salons/[id]` | Optionally set role to provider after creation. |
| Role changes | Refresh session token and redirect according to new role. | Use `useSession().update()` or server redirect after action. |
| Sidebar active state | Exact match for overview; prefix match only for non-root section routes. | Prevent sticky overview. |

## Technical Refactor Plan

### Layout Structure

Recommended:

- `app/dashboard/layout.tsx`: server-side auth guard only.
- `app/dashboard/(visitor)/...`: visitor pages.
- `app/dashboard/(provider)/...`: provider-level pages.
- `app/dashboard/salons/[salonId]/layout.tsx`: server-side salon ownership guard.
- `app/dashboard/(admin)/admin/layout.tsx`: server-side admin guard.

### Shared Shell

Create one `DashboardShell`:

- Receives `navMode`: `visitor | provider | salon | admin`.
- Receives `salonId` when in salon mode.
- Renders sidebar and mobile bottom nav from one centralized config.
- Shows account card/logout consistently.

Affected files:

- `components/layout/main-layout.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/bottom-nav.tsx`
- `lib/navigation-config.ts`

### Centralized Navigation

Replace split logic with:

- `getVisitorNav()`
- `getProviderNav(hasSalon: boolean)`
- `getSalonNav(salonId: string)`
- `getAdminNav()`
- `isNavActive(pathname, href, exact?: boolean)`

Rules:

- `/dashboard` active only when `pathname === "/dashboard"`.
- `/dashboard/bookings` active for `/dashboard/bookings/*`.
- Salon overview active only when exact salon root.
- Admin overview active only when exact `/dashboard/admin/overview`.

### Guards

Required server-side guards:

- `requireDashboardUser()`
- `requireAdminUser()`
- `requireSalonOwner(salonId)`
- `requireProviderOrAdmin()`

Current related files:

- `app/dashboard/layout.tsx`
- `proxy.ts`
- `lib/auth-utils.ts`
- `lib/actions/salon.ts`

### Empty/Loading/Error States

Create shared states:

- `DashboardEmptyState`
- `DashboardErrorState`
- `DashboardLoadingRows`
- `SalonRequiredState`
- `NoSalonYetState`

Use in:

- `app/dashboard/page.tsx`
- `app/dashboard/bookings/page.tsx`
- `app/dashboard/messages/page.tsx`
- `app/dashboard/salons/page.tsx`
- `app/salon/[id]/*` transitional routes.

## Findings

| ID | Priority | MVP blocker | Files | Problem | Risk | Solution |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | P1 | Yes | `lib/navigation-config.ts`, `sidebar.tsx`, `bottom-nav.tsx` | Multiple nav systems. | Broken active state and inconsistent role UX. | Single nav config and active-state helper. |
| D-002 | P1 | Yes | `app/dashboard/page.tsx` | Visitor overview includes provider operations. | Confusing first-run flow. | Split visitor overview from provider overview. |
| D-003 | P1 | Yes | `app/salon/[id]/*` | Salon console lives outside dashboard. | Mental model split from dashboard. | Move/redirect to `/dashboard/salons/[salonId]/*`. |
| D-004 | P2 | No | `app/profile/me/page.tsx`, `app/dashboard/profile/page.tsx` | Duplicate profile routes. | Maintenance and UX duplication. | Consolidate to `/dashboard/account`. |
| D-005 | P2 | No | `app/dashboard/subscription/page.tsx` | Subscription not actionable. | Distraction. | Keep read-only or hide until payment scope. |
