# GlowySpot Migration Reconciliation Plan

Date: 2026-05-29

Scope: documentation only. No production database change, no Prisma migration execution.

## Current State

### Local

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260117222519_add_category_model/migration.sql`
- `prisma/migrations/20260118104042_add_contact_preferences/migration.sql`
- `prisma/migrations/20260118110618_add_granular_notifications/migration.sql`

Local schema includes models and fields beyond the three migration files, including:

- `Subscription`
- `SubscriptionConfig`
- `TeamMember`
- `PasswordResetToken`
- `Salon.slug`
- `Salon.salonFingerprint`
- `Salon.allowMessages`
- `Salon.allowBookings`
- granular notification fields
- `Post.videos`
- `Post.layout`
- optional `Message.salonId`

Problem: the local migration folder does not fully explain the current local Prisma schema.

Risk: the next generated migration may be destructive or incomplete if it is created directly from this state without reconciling deployed database history.

Priority: P0

MVP blocker: yes

### Production VPS

Path: `/opt/projects/glowyspot`

Observed migrations in `_prisma_migrations`:

- `20260117222519_add_category_model`
- `20260118104042_add_contact_preferences`
- `20260118110618_add_granular_notifications`

Observed tables:

- `Account`
- `Booking`
- `Category`
- `ClosedDate`
- `Comment`
- `Favorite`
- `Like`
- `Message`
- `OpeningHour`
- `PasswordResetToken`
- `Post`
- `Review`
- `Salon`
- `Service`
- `Session`
- `Subscription`
- `SubscriptionConfig`
- `TeamMember`
- `User`
- `VerificationToken`
- `_prisma_migrations`

Production DB appears to contain tables that are not fully represented by the three local migration files shown above, so production has likely received schema changes by manual migration, baseline, or older missing migration files.

Production was not modified.

### Development VPS

Path: `/opt/projects/glowyspot-next`

Observed migrations in `_prisma_migrations`:

- `20260422170000_authoritative_baseline`

Observed tables:

- Same as production plus extra `AuditLog`.

Problem: development DB uses a single authoritative baseline migration while local/prod use the older three migration names.

Risk: dev and prod cannot be treated as equivalent migration histories. Running `prisma migrate deploy` from the current local repo may fail or attempt unintended schema changes.

Priority: P0

MVP blocker: yes

## Extra `AuditLog` Table

Finding: `AuditLog` exists on dev DB but not in local `prisma/schema.prisma` and not in prod table list.

Possible causes:

- dev-only experiment
- old baseline artifact
- planned audit feature not committed locally
- manual table

Decision needed:

1. Keep `AuditLog` as a future platform audit feature and add it to schema/migrations after design.
2. Treat it as dev-only residue and drop only on dev after backup/snapshot.
3. Preserve it outside Prisma as unmanaged table, documented explicitly.

Recommended MVP decision: do not include `AuditLog` in MVP unless admin/security audit logging is explicitly scoped. Preserve it during reconciliation snapshots, but do not build MVP logic on it.

## Recommended Baseline Strategy

Use a deliberate reconciliation branch, not an ad hoc migration.

### Step 1 - Backups

Required before any migration work:

- Production database dump from `glowyspot-db`.
- Development database dump from `glowyspot-next-db`.
- Copy of `/opt/projects/glowyspot/public/uploads`.
- Copy of `/opt/projects/glowyspot-next/storage/uploads`.
- Current local repo archive or commit.

No prod migration may run without verified backup restore.

### Step 2 - Introspection

On a local or dev clone database only:

1. Run Prisma introspection against production snapshot.
2. Run Prisma introspection against development snapshot.
3. Diff both introspected schemas against local `prisma/schema.prisma`.
4. Document:
   - missing fields
   - extra tables
   - indexes
   - constraints
   - enum/string status differences
   - nullable/default differences

### Step 3 - Choose Canonical Schema

Recommended canonical source: local `prisma/schema.prisma`, after verifying it matches actual application code expectations.

Required decisions:

- Keep or remove `AuditLog`.
- Convert `User.role` and `Booking.status` from string to enum now or defer.
- Add indexes now or after MVP.
- Decide whether subscription/payment fields remain in MVP schema.

### Step 4 - Create Reconciled Migration History

Option A, recommended for MVP:

- Create a new canonical baseline migration for fresh installs.
- Mark existing production migrations as applied in production only if needed.
- Avoid rewriting production migration history in-place.

Option B, safer for long-term but more work:

- Reconstruct every missing historical migration from schema diffs.
- Test from empty DB and from production snapshot.

Option C, not recommended:

- Run `prisma db push` against prod/dev.
- Reason: bypasses migration history and increases drift.

### Step 5 - Dev Snapshot Test

On a throwaway dev snapshot:

1. Restore production DB backup.
2. Apply candidate migration with `prisma migrate deploy`.
3. Run app build and smoke flows:
   - login
   - salon list
   - public profile
   - salon edit
   - booking request
   - provider accept/reject
4. Verify no data loss:
   - users
   - salons
   - services
   - posts/images
   - bookings
   - messages
   - subscriptions

### Step 6 - Development VPS

After snapshot passes:

- Apply candidate only to dev VPS.
- Verify `dev.glowyspot.com`.
- Compare Prisma migration table.
- Keep rollback dump.

### Step 7 - Production Eligibility

Production migration is allowed only when:

- The candidate migration has passed snapshot restore.
- The same candidate has passed dev VPS.
- A fresh production DB dump exists.
- Upload storage is backed up.
- App image/repo rollback path exists.
- A maintenance window is accepted.
- Manual smoke checklist from `GLOWYSPOT_TEST_MATRIX.md` is ready.

## Immediate Phase 1A Decision

Do not run any Prisma migration.

Treat migration reconciliation as a P0 Phase 1B task before production release. The current app can continue dev testing, but schema-changing feature work should be frozen until this plan is executed.
