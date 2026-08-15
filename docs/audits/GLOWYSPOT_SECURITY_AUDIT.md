# GlowySpot Security Audit

Audit date: 2026-05-29

No secret values are included in this document.

## Summary

Security posture is promising but not MVP-safe yet. The largest risks are vulnerable framework dependencies, route protection relying on affected Next.js versions, inconsistent migration state, upload hardening gaps, and role/session edge cases.

## Auth And Session

| Finding | Files | Problem | Risk | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- | --- |
| NextAuth JWT role stored in token | `lib/auth-options.ts` | Role is copied into JWT and refreshed only on login/update/missing role. | Admin/provider changes may not immediately reflect in existing sessions. | Force `session.update()` after role change and/or read role server-side for sensitive actions. | P1 | No |
| Credentials registration minimal validation | `lib/actions/auth.ts`, `components/auth/auth-modal.tsx` | Email/password/name validation is hand-rolled; no rate limit. | Weak accounts and brute-force surface. | Add schema validation and auth rate limiting. | P1 | Yes |
| Google OAuth callback unverified | VPS envs, Google provider config | Keys exist, but provider callback registration was not externally confirmed. | Dev/prod Google login may fail. | Verify callbacks: `/api/auth/callback/google` for prod and dev domains. | P1 | Yes |
| Inactive user handling only in signIn | `lib/auth-options.ts` | Inactivated users may retain existing JWT until expiry. | User disabled by admin could keep using session. | Check `isActive` in server-side guards/actions or invalidate sessions. | P1 | Yes |
| Demo login affordances | `components/auth/auth-modal.tsx` | UI contains demo account quick-fill. | Trust/security perception issue. | Remove before MVP test. | P1 | Yes |

## Route Protection

| Finding | Files | Problem | Risk | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Next.js version has proxy/middleware advisories | `package.json`, `proxy.ts` | `next@16.1.4` is flagged by `npm audit`. | Protected routes may be exposed through known bypass vectors. | Controlled Next upgrade on dev, then auth smoke/e2e tests. | P0 | Yes |
| Proxy role gate is coarse | `proxy.ts` | `/salon/:path*` allows any provider/admin; ownership is deferred to page/actions. | If a page misses owner guard, cross-salon access possible. | Keep proxy coarse, but add server layout ownership guard for salon console. | P1 | Yes |
| Dashboard server layout only checks logged-in | `app/dashboard/layout.tsx` | Admin/provider redirects handled elsewhere. | Confusing access, possible UI leakage. | Add role-specific nested layouts. | P2 | No |

## Authorization

| Area | Files | Current state | Risk | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Salon ownership | `lib/actions/salon.ts` | `requireSalonOwner`, `requirePostOwner`, `requireServiceOwner` exist. | Strong in actions, but page-level reads must also enforce. | Add shared server guard in salon layout. | P1 | Yes |
| Booking ownership | `lib/actions/salon.ts`, `lib/booking/booking-policy.ts` | Visitor cancel and provider accept/reject check ownership. | Good core; needs e2e. | Add tests for cross-user booking denial. | P1 | Yes |
| Message ownership | `sendMessage`, `getUserMessages`, `markMessageAsRead` | Sender/receiver checks exist for core operations. | Need check thread UI cannot infer unrelated user ids. | Add integration/e2e tests. | P2 | No |
| Favorite/like/comment | `toggleFavorite`, `toggleLike`, `addComment` | Session user must match passed user id. | Passing user id from client is unnecessary. | Derive user id only server-side. | P2 | No |
| Admin-only actions | `lib/actions/user.ts`, `lib/actions/category.ts` | Server-side admin checks exist. | Good base; role token freshness remains. | Add admin e2e and session refresh on role changes. | P1 | No |

## Upload Security

| Finding | Files | Problem | Risk | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- | --- |
| No hard file size limit | `app/api/upload/route.ts` | Reads full file into memory before processing. | Memory/storage DoS. | Reject over configured size before OpenAI/sharp processing. | P1 | Yes |
| MIME/type validation weak | `app/api/upload/route.ts` | Trusts `file.type` and `sharp` processing. | Non-image or huge image payload abuse. | Allowlist MIME and verify with `sharp.metadata()`. | P1 | Yes |
| AI moderation fail-open | `app/api/upload/route.ts` | Moderation/relevance errors log and continue. | Unsafe content can pass during API outage. | Product decision: fail-closed for public uploads or fail-soft with quarantine. | P1 | Yes |
| No rate limit | `app/api/upload/route.ts` | Auth required, but no per-user throttle. | Abuse by logged-in user. | Add per-user/IP upload throttling. | P1 | Yes |
| Path traversal handled | `app/api/files/[filename]/route.ts` | Filename sanitized. | Good. | Keep. | P2 | No |
| Storage isolation | VPS compose | Dev/prod uploads separate. | Good. | Keep. | P1 | No |

## Dependency Security

Command: `npm audit --json`

Summary:

- Total vulnerabilities: 15.
- Moderate: 7.
- High: 8.
- Critical: 0.

High severity:

- `next`: multiple advisories including RSC DoS, proxy/middleware bypass, SSRF, cache poisoning.
- `prisma` / `@prisma/config` / `effect`: high advisory through Prisma CLI/config chain.
- `defu`: prototype pollution.
- `flatted`: DoS/prototype pollution.
- `minimatch`: ReDoS.
- `picomatch`: ReDoS/method injection.

Moderate:

- `ajv`
- `brace-expansion`
- `postcss` via Next
- `next-auth` via `uuid`
- `resend` via `svix`/`uuid`
- `uuid`
- `svix`

Upgrade strategy:

1. Upgrade `next`, `eslint-config-next`, and related lockfile entries first on a branch; run `npm run build`, route protection smoke, and public pages.
2. Upgrade Prisma CLI/client together after migration reconciliation plan is ready.
3. Upgrade `resend`/`svix`/`uuid`; test password reset/welcome emails.
4. Run `npm audit fix` only after reviewing diff; avoid `--force` unless isolated because audit suggests a breaking `next-auth` path.

## Environment And Secrets

| Finding | Files/Env | Problem | Risk | Recommendation | Priority | MVP blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Local `.env` exists | `.env` | Contains real-looking secret keys; gitignored. | Accidental copy/paste or archive inclusion. | Keep out of commits; add secret scan before commit. | P1 | No |
| Example env exists | `.env.production.example` | Good, but should include dev/prod notes. | Misconfigured deploys. | Add `.env.example` or split examples. | P2 | No |
| Dev/prod NextAuth URL separated | VPS envs | Prod `glowyspot.com`, dev `dev.glowyspot.com`. | Good. | Verify OAuth callbacks. | P1 | Yes |
| Email/API keys in dev | VPS `.env.next` | Dev likely uses real Resend/OpenAI/Google keys. | Real emails/costs during testing. | Add dev flags or test recipients. | P1 | No |
| Metadata URL prod hardcoded | `app/layout.tsx`, metadata files | Dev pages can advertise prod URL. | SEO/preview confusion. | Env-based site URL. | P2 | No |

## Security Roadmap

P0 before MVP testing:

- Next.js security upgrade and route guard smoke tests.
- Migration reconciliation plan, because schema drift can break auth/data integrity.

P1 before external users:

- Upload size/type/rate limits.
- Auth validation/rate limit.
- Remove demo login shortcuts.
- Server-side salon ownership guard.
- Inactive-user session enforcement.

P2 after MVP stabilization:

- Secret scanning in CI.
- CSP/security headers review.
- Admin moderation/report queue.
- Email event audit log.
