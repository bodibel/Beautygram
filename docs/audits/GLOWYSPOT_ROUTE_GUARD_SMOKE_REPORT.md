# GlowySpot Route Guard Smoke Report

Date: 2026-05-29

Scope: Phase 1A route protection review and smoke planning.

## Files Reviewed

- `proxy.ts`
- `app/dashboard/layout.tsx`
- `app/salon/[id]/layout.tsx`
- `lib/auth-options.ts`
- `lib/auth-utils.ts`
- `lib/actions/salon.ts`
- `lib/actions/user.ts`
- `lib/actions/category.ts`

## Findings

| Area | Current state | Risk | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- |
| Logged-out dashboard access | `proxy.ts` redirects unauthenticated `/dashboard/:path*` to `/`, and `app/dashboard/layout.tsx` also redirects. | Good defense-in-depth. | Keep both proxy and layout guard. | P1 | No |
| Non-admin admin access | `proxy.ts` redirects non-admin `/dashboard/admin/*` to `/dashboard`. Admin Server Actions also call admin checks. | Good baseline. | Add e2e smoke for visitor/provider/admin. | P1 | No |
| `/salon/:path*` role gate | `proxy.ts` allows provider/admin roles and redirects visitors to `/dashboard`. | Good coarse role gate. | Keep as coarse gate only. | P1 | No |
| Salon ownership | `app/salon/[id]/layout.tsx` verifies the logged-in user owns the salon and redirects otherwise. Server Actions also use owner checks. | Strong for providers, but admin cannot inspect salon console despite proxy allowing admin. | Decide in Phase 1B whether admin should bypass owner guard or use a dedicated admin salon route. | P2 | No |
| Server Actions | Salon, booking, message, user, category actions contain session/admin/owner checks. | Good baseline; still needs e2e/integration tests. | Add route/action authorization test matrix. | P1 | Yes |
| Inactive users | `signIn` reactivates recently inactive users, but guards do not consistently check `isActive`. | Disabled users may retain an old session. | Add active-user check to server guards in Phase 1B. | P1 | Yes |

## Manual Smoke Attempts

A fresh local dev server was started with `npm run dev:lowmem` after the Phase 1A changes. No production or dev VPS route was modified.

Unauthenticated `curl -I --max-redirs 0` results:

| Route | Result |
| --- | --- |
| `/dashboard` | `307 Temporary Redirect` to `/?authRequired=true` |
| `/dashboard/admin/overview` | `307 Temporary Redirect` to `/?authRequired=true` |
| `/salon/test-salon` | `307 Temporary Redirect` to `/?authRequired=true` |

Still required with real authenticated fixtures:

- Visitor session `GET /salon/:id` should redirect to `/dashboard?forbidden=true`.
- Provider session for another salon should redirect to `/dashboard/salons`.
- Non-admin session `GET /dashboard/admin/overview` should redirect to `/dashboard?forbidden=true`.

## Phase 1A Decision

No large route refactor in Phase 1A.

Small changes allowed:

- Keep Next security upgrade.
- Keep existing `proxy.ts`.
- Keep existing salon owner layout guard.

Deferred to Phase 1B:

- Active-user guard.
- Admin salon inspection policy.
- Playwright route guard smoke suite.
