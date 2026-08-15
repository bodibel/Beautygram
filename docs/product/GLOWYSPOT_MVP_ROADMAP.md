# GlowySpot MVP Roadmap

Audit date: 2026-05-29

## Phase 1 - Stabilization And Audit Fixes

Goal: make the current foundation non-fragile.

Estimated effort: 3-5 focused development days.

| Task | Files | Problem | Action | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- |
| Security dependency plan | `package.json`, `package-lock.json`, `next.config.ts` | High audit findings, especially Next. | Upgrade Next in dev branch, run build/tests/auth smoke. | P0 | Yes |
| Migration reconciliation | `prisma/schema.prisma`, `prisma/migrations/*`, VPS DBs | Dev/prod/local migration histories diverge. | Introspect DBs, decide baseline, create safe migration plan. | P0 | Yes |
| Env separation checklist | `.env.production.example`, VPS envs | Dev/prod separate but operational policy not documented. | Document required keys, callbacks, dev email/API policy. | P1 | No |
| Encoding cleanup | `lib/actions/*`, `lib/booking/*`, `app/*`, `components/*`, tests | Mojibake in UI and business messages. | Dedicated UTF-8 pass with tests. | P1 | No |
| Route protection audit | `proxy.ts`, dashboard/salon layouts | Coarse proxy and vulnerable Next. | Add nested server guards and e2e checks. | P1 | Yes |
| Upload hardening | `app/api/upload/route.ts`, `app/api/files/[filename]/route.ts` | No size/type/rate limits. | Add limits and moderation failure policy. | P1 | Yes |
| Dashboard active state | `lib/navigation-config.ts`, `sidebar.tsx`, `bottom-nav.tsx` | Active state and role nav inconsistent. | Centralize nav and active helper. | P1 | Yes |
| Remove demo auth UI | `components/auth/auth-modal.tsx` | Demo account shortcuts. | Remove before MVP. | P1 | Yes |

Phase 1 exit criteria:

- `npm audit` has no unresolved P0 framework auth/proxy issue.
- Local and dev DB migration strategy documented and tested on dev clone/snapshot.
- `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` pass.
- Core protected-route smoke tests pass.
- No obvious mojibake on main MVP screens.

## Phase 2 - Dashboard Restructure And MVP Flows

Goal: make visitor/provider usage coherent.

Estimated effort: 5-8 focused development days.

| Task | Files | Problem | Action | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- |
| Visitor dashboard cleanup | `app/dashboard/page.tsx`, `bookings`, `favorites`, `messages` | Mixed visitor/provider messaging. | Keep visitor-only overview and simple nav. | P1 | Yes |
| Provider dashboard cleanup | `app/dashboard/salons`, `app/salon/[id]/*` | Salon console outside dashboard model. | Add provider overview and salon console redirects/shell. | P1 | Yes |
| Salon management flow | `components/wizard/SalonWizard.tsx`, salon pages | Create/edit/service/gallery scattered. | Define salon profile/service/portfolio/hours sequence. | P1 | Yes |
| Booking flow stabilization | `createBooking`, booking pages/components | Request-only but not fully communicated/tested. | Label clearly, enforce basic checks, e2e accept/reject. | P1 | Yes |
| Empty/loading/error states | dashboard and salon pages | Inconsistent and sometimes console-only. | Shared state components. | P2 | No |
| Mobile usability | `bottom-nav.tsx`, dashboard/salon pages | Mobile nav logic separate and dense. | Test core flows at mobile viewport. | P1 | Yes |
| Messages simplification | `app/dashboard/messages/page.tsx` | Thread UI is complex. | Keep minimal thread list + reply. | P2 | No |

Phase 2 exit criteria:

- Visitor and provider routes are predictable.
- Users with no salon see onboarding, not operational dead ends.
- Users with salon can manage it without route confusion.
- Booking request lifecycle works from both roles.
- Sidebar/bottom nav active state is correct.

## Phase 3 - MVP Test Version Closure

Goal: produce a dev version where only minor defects remain.

Estimated effort: 3-5 focused development days after Phase 2.

| Task | Files/Area | Action | Priority | MVP blocker |
| --- | --- | --- | --- | --- |
| Full MVP smoke | Local + `dev.glowyspot.com` | Execute test matrix manually and/or automated. | P1 | Yes |
| E2E setup | New Playwright tests | Cover auth, salon create, booking, authz. | P1 | Yes |
| SEO/meta cleanup | `app/layout.tsx`, public pages | Env-based site URL, OG, canonical. | P2 | No |
| Deploy checklist | VPS docs | Document dev deploy, prod deploy, rollback. | P1 | Yes |
| Prod release checklist | VPS prod | DB backup, migration dry run, env check, smoke test. | P0 | Yes |
| Rollback plan | VPS compose/archive | Keep previous image/repo and DB backup path. | P0 | Yes |
| Final performance sanity | Public pages | Check image sizes, Next image cache, slow queries. | P2 | No |

Phase 3 exit criteria:

- Dev is stable enough for invited testers.
- Prod release has a written rollback path.
- No P0/P1 MVP blockers remain.
- Known P2/P3 items are documented and accepted.

## What Not To Touch Yet

- Do not run production Prisma migrations until migration history is reconciled and prod DB backup exists.
- Do not introduce Stripe/payment during MVP stabilization.
- Do not build real-time availability before request-based booking is proven.
- Do not refactor all UI components before dashboard IA is settled.
- Do not force dependency upgrades with breaking auth changes without an isolated branch and smoke plan.

## Suggested Next Codex Prompt

```text
Kérlek hajtsd végre a Phase 1 stabilizálást a GlowySpot projekten.
Először készíts rövid végrehajtási tervet, majd külön commitolható lépésekben:
1. Next/security dependency upgrade dev-safe módon,
2. route protection smoke ellenőrzés,
3. migration reconciliation terv és DB diff dokumentáció migration futtatása nélkül,
4. upload limit/type/rate policy implementáció,
5. dashboard active state javítás,
6. mojibake javítás az MVP képernyőkön.
Ne nyúlj prod VPS-hez, ne futtass prod migrationt.
Minden lépés után futtasd: npm run lint, npm run typecheck, npm run test:run, és ahol releváns npm run build.
```
