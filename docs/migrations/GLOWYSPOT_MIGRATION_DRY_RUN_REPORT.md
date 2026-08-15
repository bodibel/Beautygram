# GlowySpot Migration Dry-Run Report

Date: 2026-05-29

Scope: practical snapshot, restore and introspection preparation. No production Prisma migration was run. No `prisma db push` was run. No production or development VPS database write was performed.

## Command Safety Summary

### VPS read-only commands executed

- `docker ps` against `pws-sandbox` to verify running containers.
- `docker exec glowyspot-db ... pg_dump -Fc --no-owner --no-acl` redirected to VPS `/tmp`.
- `docker exec glowyspot-next-db ... pg_dump -Fc --no-owner --no-acl` redirected to VPS `/tmp`.
- `sha256sum`, `wc -c`, `ls -lh` on dump files.
- `psql ... select migration_name from _prisma_migrations ...` on prod/dev containers.
- `psql ... select tablename from pg_tables ...` on prod/dev containers.
- `scp` from VPS `/tmp` to local `.migration-dry-run`.

These commands read from prod/dev DBs and wrote dump/log files only to `/tmp` on the VPS and `.migration-dry-run` locally.

### Local snapshot write commands executed

- Created local throwaway databases inside local Docker container `glowyspot-db`:
  - `glowyspot_prod_snapshot`
  - `glowyspot_dev_snapshot`
- Restored dumps into those local snapshot DBs with `pg_restore`.
- Ran Prisma introspection against local snapshot DBs only.

No app database, VPS database, or production app file was modified.

## Snapshot Locations

Timestamp: `20260529-120717`

### VPS temporary files

Directory:

- `/tmp/glowyspot-migration-dry-run-20260529-120717`

Files:

- `prod-20260529-120717.dump`
- `prod-20260529-120717.dump.sha256`
- `prod-20260529-120717.dump.size`
- `prod-migrations.txt`
- `prod-tables.txt`
- `prod-table-count.txt`
- `dev-20260529-120717.dump`
- `dev-20260529-120717.dump.sha256`
- `dev-20260529-120717.dump.size`
- `dev-migrations.txt`
- `dev-tables.txt`
- `dev-table-count.txt`

### Local files

Directory, ignored by git:

- `.migration-dry-run/20260529-120717/dumps`
- `.migration-dry-run/20260529-120717/logs`

Dump sizes:

- Prod dump: `49615` bytes
- Dev dump: `54165` bytes

Checksums:

- Prod: `d07ff764d6611839c573c97e6c3c6792b1155055392f353e0b0590b70878c6f2`
- Dev: `3f992bb4c9d807b90cd515a0934cffad2372b1e9b6fe7de88d61aabcd0786cae`

## Upload Backup Commands

Documented but not executed in this dry-run because schema drift analysis does not need upload files.

Production uploads:

```bash
TS="$(date +%Y%m%d-%H%M%S)"
tar -C /opt/projects/glowyspot/public -czf "/tmp/glowyspot-prod-uploads-${TS}.tar.gz" uploads
sha256sum "/tmp/glowyspot-prod-uploads-${TS}.tar.gz"
wc -c "/tmp/glowyspot-prod-uploads-${TS}.tar.gz"
```

Development uploads:

```bash
TS="$(date +%Y%m%d-%H%M%S)"
tar -C /opt/projects/glowyspot-next/storage -czf "/tmp/glowyspot-dev-uploads-${TS}.tar.gz" uploads
sha256sum "/tmp/glowyspot-dev-uploads-${TS}.tar.gz"
wc -c "/tmp/glowyspot-dev-uploads-${TS}.tar.gz"
```

## Repo State

- Branch: `main`
- Commit: `35922ecf200684e6fe7cff14ca62684df4668883`
- Worktree: dirty from Phase 1A/1B/1C and current dry-run docs/introspection files.
- Important untracked/changed files include audit docs, test files, `proxy.ts`, dashboard/salon route additions, and `prisma/introspection/*`.
- `.migration-dry-run/` was added to `.gitignore` to prevent accidental dump commits.

## Restore Verification

Local Docker Postgres container used: `glowyspot-db`

Snapshot DBs:

- `glowyspot_prod_snapshot`
- `glowyspot_dev_snapshot`

Table counts:

- Prod snapshot: `21`
- Dev snapshot: `22`

Production snapshot migration history:

- `20260117222519_add_category_model`
- `20260118104042_add_contact_preferences`
- `20260118110618_add_granular_notifications`

Development snapshot migration history:

- `20260422170000_authoritative_baseline`

Main table presence:

| Table | Prod snapshot | Dev snapshot |
| --- | --- | --- |
| `User` | yes | yes |
| `Salon` | yes | yes |
| `Booking` | yes | yes |
| `Message` | yes | yes |
| `Subscription` | yes | yes |
| `Post` | yes | yes |
| `Review` | yes | yes |
| `AuditLog` | no | yes |

## Introspection Outputs

Created:

- `prisma/introspection/prod_snapshot.schema.prisma`
- `prisma/introspection/dev_snapshot.schema.prisma`

The main schema was not overwritten:

- `prisma/schema.prisma`

Prisma introspection results:

- Prod snapshot: `20` models
- Dev snapshot: `21` models

## Diff Results

Raw comparison artifacts:

- `.migration-dry-run/20260529-120717/logs/schema-compare.txt`
- `.migration-dry-run/20260529-120717/logs/local-to-prod-migrate-diff.sql`
- `.migration-dry-run/20260529-120717/logs/local-to-dev-migrate-diff.sql`
- `.migration-dry-run/20260529-120717/logs/prod-to-dev-migrate-diff.sql`

### Local schema vs prod snapshot

Prisma `migrate diff --script` result:

```sql
-- This is an empty migration.
```

Interpretation:

- The current local `prisma/schema.prisma` is structurally equivalent to the production snapshot from Prisma's migration-diff perspective.
- The many textual differences in raw introspection are mostly Prisma representation differences:
  - relation field names such as `owner` vs introspected `User`
  - comments stripped from introspection
  - `@updatedAt` not recoverable from DB introspection
  - `@default(cuid())` not present in the DB because IDs are generated client-side
  - some `@db.Text` annotations not round-tripped as local code style

Meaningful production drift found:

- Migration history does not explain the deployed schema: prod has `Subscription`, `SubscriptionConfig`, `TeamMember`, `PasswordResetToken`, and other current tables even though `_prisma_migrations` contains only the three older migration names.
- This is a migration-history drift, not an immediate schema-shape drift between local schema and prod snapshot.

### Local schema vs dev snapshot

Prisma `migrate diff --script` result:

```sql
ALTER TABLE "Salon" ALTER COLUMN "country" SET DEFAULT 'MagyarorszÃ¡g';

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
```

Plus indexes:

- `AuditLog_action_createdAt_idx`
- `AuditLog_entity_entityId_createdAt_idx`
- `AuditLog_userId_createdAt_idx`

And FK:

- `AuditLog_userId_fkey` references `User(id)` with `ON DELETE SET NULL`.

Meaningful dev drift:

- Dev has extra `AuditLog`.
- Dev has mojibake default on `Salon.country`: `MagyarorszÃ¡g` instead of `Magyarország`.
- Dev migration history is a single `20260422170000_authoritative_baseline`, unlike prod/local.

### Prod snapshot vs dev snapshot

Meaningful differences:

- Dev has extra `AuditLog`.
- Dev has the mojibake `Salon.country` default.
- Migration histories differ:
  - prod: three old migrations
  - dev: one authoritative baseline

No other Prisma-detected structural drift was found between prod and dev snapshots.

## Canonical Schema Recommendation

Recommended canonical schema for MVP:

- Keep local `prisma/schema.prisma` as the canonical app schema.
- Do not add `AuditLog` to MVP unless audit logging becomes explicit MVP scope.
- Treat dev `AuditLog` as dev-only residue for now.
- Fix dev `Salon.country` default mojibake during dev reconciliation, not as an urgent prod migration.

Fresh install baseline:

- Yes, a new canonical baseline migration is needed for fresh installs because the current migration folder does not explain the current full schema.
- The baseline should represent local `prisma/schema.prisma` after confirming no unintended destructive SQL against prod snapshot.

Production migration history handling:

- Do not rewrite prod `_prisma_migrations` in-place.
- Do not run `db push`.
- Create a reconciliation strategy that either:
  - keeps prod's existing three migrations and adds a safe no-op/metadata baseline for future deploys, or
  - creates a new baseline path for fresh installs while using `prisma migrate resolve` only after a reviewed plan.

MVP-before fields/indexes:

- Keep current subscription/booking/message/salon fields because app code already references them.
- Add only indexes that are proven necessary for MVP performance after query review.
- Do not introduce `AuditLog` before MVP.

MVP-after:

- Audit logging.
- Additional reporting/analytics indexes.
- Enum conversion for `User.role` and `Booking.status`, unless implemented with a carefully rehearsed data migration.

## Prisma Upgrade Decision

Prisma upgrade is not recommended before migration reconciliation.

Recommended order:

1. Migration reconciliation baseline plan and rehearsal.
2. Prisma upgrade branch against snapshot DBs.
3. Phase 2 dashboard restructure.

Reasoning:

- Schema shape is mostly aligned, but migration history is not.
- Prisma 7 is a major upgrade and should not be combined with baseline reconciliation.
- Keeping these separate makes rollback and review much easier.

## Safety Conclusion

- Production DB was read only.
- Development DB was read only.
- Writes occurred only to VPS `/tmp`, local `.migration-dry-run`, local `prisma/introspection`, `.gitignore`, and local throwaway snapshot DBs.
- No Prisma migration was executed.
- No `prisma db push` was executed.
- No production app files were modified.

It is technically safe to continue Phase 2 dashboard restructure from an app-code perspective, but production release should still wait for migration reconciliation because migration history drift remains P0.
