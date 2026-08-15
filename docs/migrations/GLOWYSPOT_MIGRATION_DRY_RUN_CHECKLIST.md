# GlowySpot Migration Dry-Run Checklist

Date: 2026-05-29

Scope: preparation for Prisma migration reconciliation. No migration should be run against production during this checklist.

## Non-negotiable rules

- Do not run `prisma migrate deploy` against production.
- Do not modify `/opt/projects/glowyspot` production files or database.
- Use snapshots/restores only for comparison.
- Store dumps outside the git repo or in an ignored backup directory.
- Redact secrets before sharing logs.

## 1. Capture production snapshot

On the VPS, read-only operational step:

```bash
cd /opt/projects/glowyspot
docker compose ps
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl > /tmp/glowyspot-prod-YYYYMMDD.dump
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select migration_name, finished_at from _prisma_migrations order by finished_at;"
```

Copy the dump to a secure local backup path, not into git.

Expected production migration history from the audit:

- `20260117222519_add_category_model`
- `20260118104042_add_contact_preferences`
- `20260118110618_add_granular_notifications`

## 2. Capture dev snapshot

On the VPS dev project only:

```bash
cd /opt/projects/glowyspot-next
docker compose ps
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl > /tmp/glowyspot-dev-YYYYMMDD.dump
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select migration_name, finished_at from _prisma_migrations order by finished_at;"
```

Expected dev migration history from the audit:

- `20260422170000_authoritative_baseline`
- Extra dev-only table: `AuditLog`

## 3. Restore to local throwaway databases

Create isolated local databases, for example:

```bash
createdb glowyspot_prod_snapshot
createdb glowyspot_dev_snapshot
pg_restore --clean --if-exists --no-owner --no-acl -d glowyspot_prod_snapshot /secure/backups/glowyspot-prod-YYYYMMDD.dump
pg_restore --clean --if-exists --no-owner --no-acl -d glowyspot_dev_snapshot /secure/backups/glowyspot-dev-YYYYMMDD.dump
```

Do not point the app `.env` at production or VPS databases.

## 4. Prisma introspection on snapshots

Use temporary env files or one-off `DATABASE_URL` values:

```bash
DATABASE_URL="postgresql://USER:PASS@localhost:5432/glowyspot_prod_snapshot" npx prisma db pull --schema prisma/schema.prod-introspected.prisma
DATABASE_URL="postgresql://USER:PASS@localhost:5432/glowyspot_dev_snapshot" npx prisma db pull --schema prisma/schema.dev-introspected.prisma
```

These generated introspection files are comparison artifacts. Do not overwrite `prisma/schema.prisma` until a decision is made.

## 5. Compare schemas

Compare three sources:

1. Local canonical candidate: `prisma/schema.prisma`
2. Production snapshot introspection: `prisma/schema.prod-introspected.prisma`
3. Dev snapshot introspection: `prisma/schema.dev-introspected.prisma`

Suggested checks:

```bash
git diff --no-index prisma/schema.prisma prisma/schema.prod-introspected.prisma
git diff --no-index prisma/schema.prisma prisma/schema.dev-introspected.prisma
git diff --no-index prisma/schema.prod-introspected.prisma prisma/schema.dev-introspected.prisma
```

Focus on:

- Tables missing from local migration history.
- Enum differences.
- Index and unique constraint differences.
- Relation optionality.
- Cascade/delete behavior.
- Booking status consistency.
- Subscription/team/message/media related models.

## 6. Handle dev extra `AuditLog`

Decision options:

| Option | When to choose | Consequence |
| --- | --- | --- |
| Drop from canonical schema | If `AuditLog` is experimental/dev-only | Do not include it in prod baseline |
| Keep as future feature | If admin/security audit logging is required for MVP | Add it intentionally to canonical schema with migration |
| Archive separately | If useful historically but not part of app runtime | Export then exclude from baseline |

Default recommendation for MVP: exclude `AuditLog` from the production baseline unless a concrete audit-log feature is implemented.

## 7. Baseline decision points

Before creating any new migration:

- Confirm which schema is canonical.
- Confirm whether production already has tables that local migrations do not represent.
- Confirm whether dev baseline should be discarded/recreated or preserved.
- Confirm whether `AuditLog` is canonical.
- Confirm indexes and constraints needed before MVP.
- Confirm rollback path and downtime window.

## 8. Dry-run migration rehearsal

Only after the canonical schema is chosen:

```bash
DATABASE_URL="postgresql://USER:PASS@localhost:5432/glowyspot_prod_snapshot_rehearsal" npx prisma migrate diff \
  --from-url "$PROD_SNAPSHOT_DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/dry-run-prod-reconciliation.sql
```

Review generated SQL manually. Do not apply it to production.

## 9. When production migration becomes allowed

Production migration is allowed only after:

- Prod dump restore has been tested locally.
- Dry-run SQL has been reviewed.
- Dev snapshot rehearsal passes.
- App build and smoke tests pass against migrated snapshot.
- Rollback restore procedure is documented and tested.
- Maintenance window is approved.
