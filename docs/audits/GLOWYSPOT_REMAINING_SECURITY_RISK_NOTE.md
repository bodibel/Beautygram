# GlowySpot Remaining Security Risk Note

Date: 2026-05-29

Source: `npm audit --json` after Phase 1B/1C.

## Current audit summary

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 7 |
| Moderate | 6 |
| Total | 13 |

## Remaining advisories

| Package/advisory group | Severity | Runtime risk | Notes | Recommended action |
| --- | --- | --- | --- | --- |
| `prisma` via `@prisma/config` / `effect` | High | Mostly dev/CLI/tooling risk unless Prisma CLI/config parsing runs in production runtime. | Direct package is `prisma`, used for CLI/migrations/generation. | Do not force upgrade before migration reconciliation. Test Prisma 7 upgrade on throwaway branch after schema baseline is stable. |
| `next-auth` via nested `uuid` | Moderate | Possible runtime dependency exposure through auth package internals, but audit suggests breaking/unhelpful fix path. | Direct `uuid` was upgraded, but `next-auth` bundles older nested `uuid`. | Stay on NextAuth v4 for now; evaluate Auth.js migration separately. No safe non-breaking audit fix shown. |
| `next` via nested `postcss` | Moderate | Potential build/runtime CSS processing concern depending usage; audit's suggested fix is a nonsensical major downgrade to Next 9. | Next is already on `16.2.6`; proxy/middleware P0 risk was reduced in Phase 1A. | Monitor Next patch releases; do not downgrade. |
| `defu`, `flatted`, `minimatch`, `picomatch`, `brace-expansion`, `ajv` | Moderate/High | Mostly transitive tooling/glob/config parsing risk; some could be runtime if pulled by runtime dependency path. | Needs dependency tree triage before upgrades. | Run `npm ls <package>` during security cleanup; upgrade parent packages conservatively. |

## Prisma upgrade decision

Prisma upgrade is safe only after:

1. `GLOWYSPOT_MIGRATION_DRY_RUN_CHECKLIST.md` snapshot restore is complete.
2. Canonical schema is chosen.
3. Prisma 7 branch is tested against local snapshot DBs.
4. `prisma generate`, `npm run typecheck`, `npm run test:run`, and `npm run build` pass.
5. Generated migration SQL is reviewed.

Do not upgrade Prisma in the same commit as migration baseline reconciliation.

## NextAuth/uuid decision

Current audit does not show a clean non-breaking NextAuth v4 fix for the nested `uuid` advisory. The practical options are:

- Keep NextAuth v4, document the residual risk, and harden route/action authorization.
- Plan a separate Auth.js migration spike after MVP stabilization.
- Avoid `npm audit fix --force`, because suggested paths are breaking or invalid for the current stack.

## Current risk posture

The most important runtime security improvements already completed:

- Active-user server-side guard.
- Upload fail-closed moderation policy.
- Upload MIME/extension/metadata/size checks.
- Proxy route guard tests.
- Ownership/admin action guard tests.

Remaining P0/P1 risk is mostly around database schema/migration reconciliation and lack of DB-backed/e2e auth fixtures.
