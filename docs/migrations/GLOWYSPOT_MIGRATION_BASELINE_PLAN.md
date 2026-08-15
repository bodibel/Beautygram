# GlowySpot Migration Reconciliation Baseline Plan

Date: 2026-05-29

Scope: planning only. No production migration, no `prisma db push`, no production DB write, and no VPS environment change.

## Current Facts

- Local `prisma/schema.prisma` and production snapshot are structurally equivalent according to `prisma migrate diff`.
- Production snapshot has `21` tables.
- Development snapshot has `22` tables.
- Development-only extra table: `AuditLog`.
- Production migration history:
  - `20260117222519_add_category_model`
  - `20260118104042_add_contact_preferences`
  - `20260118110618_add_granular_notifications`
- Development migration history:
  - `20260422170000_authoritative_baseline`
- Local/prod -> dev drift:
  - extra `AuditLog`
  - `Salon.country` default mojibake in dev snapshot: `MagyarorszÃ¡g`
- The main schema was not overwritten during introspection.

The core problem is migration-history drift, not production schema-shape drift.

## Goals

1. Fresh install works from an empty DB.
2. Existing production snapshot stays compatible.
3. Development baseline drift is handled.
4. `AuditLog` has an explicit decision.
5. Prisma upgrade can be tested safely afterward.
6. Production release has backup, rollback and smoke-test gates.

## Option A - Keep Existing Prod History + Add Canonical Baseline For Fresh Installs

### Summary

Keep production's existing `_prisma_migrations` history intact. Add a new canonical baseline path for fresh installs and document that existing prod is already schema-equivalent to local schema.

### When Good

- MVP needs the lowest-risk path.
- Production schema already matches local schema.
- We want to avoid rewriting production migration history.
- We accept that historical migrations are imperfect, but future work must be clean.

### When Dangerous

- If a future `prisma migrate deploy` expects the new baseline migration to be applied to production and tries to apply full `CREATE TABLE` SQL against existing tables.
- If the baseline is placed directly into `prisma/migrations` without a clear deployed-DB strategy.
- If fresh install and deployed-prod paths are not separately tested.

### How To Apply

1. Keep current production migration records unchanged.
2. Generate a canonical baseline SQL for empty databases from current `prisma/schema.prisma`.
3. Store the baseline in a dedicated documented path first, for example:
   - `prisma/baseline/20260529_canonical_baseline.sql`
   - or a migration folder only after the deployment strategy is finalized.
4. Test fresh install by applying baseline to an empty throwaway DB.
5. Test production snapshot by verifying that local schema -> prod snapshot remains an empty diff.
6. Only if this baseline is later moved into `prisma/migrations`, use `prisma migrate resolve --applied <baseline>` on already-equivalent deployed DBs after explicit approval and backup.

### Pros

- Lowest risk for production.
- Preserves production history.
- Solves fresh-install documentation once baseline is generated.
- Keeps MVP moving without pretending historical migrations are clean.

### Cons

- Requires operational discipline: fresh-install baseline and deployed-prod state must be documented.
- `prisma migrate deploy` must not blindly run against prod until the baseline application/resolve strategy is rehearsed.
- Historical drift remains visible.

## Option B - Reconstructed Migration History

### Summary

Rebuild all missing historical migrations so the migration folder tells the full story from empty DB to current schema.

### When Good

- Long-term maintainability is the highest priority.
- There is enough time to reconstruct every schema evolution.
- We need a clean, auditable migration sequence for compliance or team onboarding.

### When Too Much Work

- Original intermediate states are unknown or were applied manually.
- Production already contains the final schema, but not the intermediate migration records.
- MVP timeline favors stabilization over archaeology.

### Pros

- Best long-term migration hygiene.
- Fresh installs and deployed environments can eventually share one coherent history.
- Easier future Prisma upgrades once completed.

### Cons

- High effort and high chance of reconstructing history incorrectly.
- May still require `migrate resolve` on production because prod did not apply those reconstructed migrations.
- Large review burden before MVP.

### Technical Assessment

This is the "cleanest" option on paper but not the best MVP path. Because local schema and prod snapshot are already equivalent, reconstructing all missing steps adds risk without immediate app behavior benefit.

## Option C - New Authoritative Baseline Branch

### Summary

Create a new branch that replaces the old migration history with a single authoritative baseline matching the local canonical schema, similar to dev's current `20260422170000_authoritative_baseline`, but without `AuditLog` and without mojibake defaults.

### Dev Handling

- Dev currently has an authoritative baseline but includes `AuditLog` and a mojibake country default.
- Dev would need a deliberate cleanup path:
  - either reset/recreate dev DB from the new baseline, or
  - apply a dev-only cleanup migration to drop/ignore `AuditLog` and fix `Salon.country`.

### Prod Handling

- Production has the three old migration records.
- If a new authoritative baseline migration is placed into `prisma/migrations`, production cannot simply run it because tables already exist.
- A future production rollout would need:
  - fresh backup,
  - snapshot rehearsal,
  - `prisma migrate resolve --applied <new_baseline>` on prod only after explicit approval,
  - then future migrations can run normally.

### Possible `migrate resolve` Use

`prisma migrate resolve --applied <baseline>` could mark the new baseline as applied on a DB that already matches it. This must only be done after snapshot proof that the schema is equivalent.

### Pros

- Clean future migration history from a known baseline.
- Easy fresh installs after baseline.
- Aligns dev and future environments.

### Cons

- Dangerous if applied instead of resolved on existing production.
- Requires careful operational step that changes `_prisma_migrations`.
- If done incorrectly, `migrate deploy` may attempt destructive or duplicate SQL.

### Technical Assessment

This is a good post-MVP or controlled pre-release path, but it needs a dedicated rehearsal PR and release checklist. It is more invasive than Option A.

## `AuditLog` Decision

### Recommendation

Do not include `AuditLog` in MVP.

### Rationale

- It exists only in dev snapshot.
- It is not in local `prisma/schema.prisma`.
- It is not in production.
- No current MVP flow depends on it.
- Adding audit logging properly requires product decisions:
  - which actions are logged,
  - retention,
  - admin visibility,
  - PII handling,
  - GDPR deletion/export impact.

### Treatment

- Treat `AuditLog` as dev-only residue.
- Do not add it to the canonical baseline.
- Do not drop it from dev until a dev DB backup exists and dev cleanup is explicitly approved.
- Keep it documented as a later dedicated audit logging feature.

### Future Feature Consequence

If audit logging returns later, add it intentionally:

- Add `AuditLog` model to `prisma/schema.prisma`.
- Add a normal forward migration.
- Add write helpers and admin UI/read permissions.
- Add privacy/security policy.

## `Salon.country` Mojibake Default Decision

### Current Assessment

- Local/prod canonical default is intended to be `Magyarország`.
- Dev snapshot has `MagyarorszÃ¡g`, likely from the dev authoritative baseline artifact.
- This is not a production issue based on the dry-run.

### Recommendation

- Do not run an urgent prod migration.
- Fix dev only during dev reconciliation.
- Keep app-level fallback/default as `Magyarország` in form/action code.
- Add a dev cleanup migration or dev reset step only after choosing the baseline strategy.

### Schema Consequence

If dev is reset from canonical baseline, the problem disappears. If dev is preserved, run a small dev-only correction after backup:

```sql
ALTER TABLE "Salon" ALTER COLUMN "country" SET DEFAULT 'Magyarország';
```

Do not apply this to prod unless a fresh prod snapshot proves prod has the same bad default.

## Recommended Path

### Strong Recommendation

Choose Option A now, with a controlled path toward Option C after MVP stabilization.

### Why

- Production schema already matches local schema.
- The production risk is not data shape, but migration metadata/history.
- MVP needs minimal production risk.
- Fresh install can be solved by generating and testing a canonical baseline without touching production.
- Prisma upgrade should not be mixed with baseline history surgery.

### Sequence

1. Freeze schema-changing work until baseline PR is created.
2. Generate canonical baseline SQL from current local `prisma/schema.prisma` for empty DB testing.
3. Store it in a clear baseline/documentation path first, not automatically deployable to prod.
4. Test fresh install on empty throwaway DB.
5. Test prod snapshot compatibility:
   - local schema vs prod snapshot diff remains empty.
   - `prisma migrate deploy` rehearsal must not attempt to create duplicate tables.
6. Decide whether to keep baseline outside `prisma/migrations` for now or introduce it with a `migrate resolve` playbook.
7. Clean dev:
   - exclude/drop `AuditLog` only after backup if dev should match canonical,
   - fix `Salon.country` default,
   - or recreate dev DB from canonical baseline if acceptable.
8. Only after reconciliation is stable, create a Prisma upgrade branch.
9. After Prisma upgrade branch passes snapshots and tests, continue broader Phase 2 dashboard work.

### What Not To Do

- Do not run `prisma db push` on prod or dev.
- Do not delete or rewrite production `_prisma_migrations`.
- Do not place a full baseline migration into `prisma/migrations` and run `migrate deploy` on prod without `resolve` rehearsal.
- Do not include `AuditLog` in MVP just because it exists in dev.
- Do not combine Prisma 7 upgrade with migration baseline changes.

### Prisma Upgrade Timing

Prisma upgrade becomes safe after:

- canonical baseline strategy is reviewed,
- fresh install rehearsal passes,
- prod snapshot rehearsal passes,
- dev cleanup/reset decision is made,
- no destructive SQL appears unexpectedly.

### Phase 2 Dashboard Timing

Phase 2 dashboard restructure is safe from an app-code perspective now, because local/prod schema shape matches. However:

- do not add schema-changing dashboard features until baseline reconciliation is complete;
- production release remains blocked by migration-history drift.

## PR Plan

### PR 1 - Baseline Planning And Artifacts

Files to add:

- `GLOWYSPOT_MIGRATION_BASELINE_PLAN.md`
- `prisma/baseline/README.md`
- `prisma/baseline/20260529_canonical_baseline.sql`

Files to keep:

- `prisma/schema.prisma`
- existing `prisma/migrations/*`

Do not add the canonical baseline into `prisma/migrations` in this PR unless the team accepts the resolve playbook.

### PR 2 - Fresh Install Rehearsal Script

Possible files:

- `scripts/migration-baseline/fresh-install-rehearsal.ps1`
- `scripts/migration-baseline/fresh-install-rehearsal.sh`
- `docs/migration-baseline-rehearsal.md`

Script responsibilities:

- create empty throwaway DB,
- apply canonical baseline SQL,
- run `prisma db pull`/`migrate diff` comparison,
- run `prisma generate`,
- run app checks.

No prod/dev connection strings should be embedded.

### PR 3 - Dev Cleanup Plan

Possible files:

- `docs/dev-db-reconciliation.md`
- optional `prisma/dev-cleanup/fix-dev-country-default.sql`
- optional `prisma/dev-cleanup/drop-dev-audit-log.sql`

This PR should not touch prod. It only prepares dev cleanup after backup.

### PR 4 - Future Prisma Upgrade Branch

Files likely modified:

- `package.json`
- `package-lock.json`
- `prisma.config.ts`
- generated Prisma import/config changes if required by Prisma 7

Only after PR 1/2 pass.

## Migration File Decision

### Should A New Migration File Be Added Now?

Not directly under `prisma/migrations` yet.

Recommended first artifact:

- `prisma/baseline/20260529_canonical_baseline.sql`

Reason:

- Fresh install needs baseline SQL.
- Existing prod must not accidentally apply full baseline as a normal migration.
- The team still needs to choose whether to use `migrate resolve` for deployed DBs.

### Should Existing `prisma/migrations/*` Be Reordered Or Deleted?

No.

Keep:

- `20260117222519_add_category_model`
- `20260118104042_add_contact_preferences`
- `20260118110618_add_granular_notifications`

Do not delete history until a dedicated authoritative baseline branch is approved.

## Test And Release Checklist

### Fresh Install Empty DB

- Create throwaway empty DB.
- Apply canonical baseline SQL.
- Run `npx prisma generate`.
- Run `npx prisma migrate diff --from-url <fresh_db_url> --to-schema-datamodel prisma/schema.prisma --script`.
- Expected result: empty migration.

### Prod Snapshot Restore + Migrate Deploy Dry-Run

- Restore latest prod dump to throwaway DB.
- Confirm data counts for `User`, `Salon`, `Service`, `Booking`, `Message`, `Subscription`.
- Run schema diff against local schema.
- Expected result: empty migration.
- Do not run deploy against prod.
- If baseline enters `prisma/migrations`, rehearse `migrate resolve --applied` on snapshot before any real environment.

### Dev Snapshot Restore + Reconciliation Dry-Run

- Restore latest dev dump to throwaway DB.
- Confirm `AuditLog` exists.
- Confirm `Salon.country` default.
- Decide:
  - reset dev from canonical baseline, or
  - run dev cleanup SQL after backup.
- Expected final diff to local schema: empty migration.

### Required Commands

- `npx prisma generate`
- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`

### Core Smoke

- Login.
- Salon list.
- Public profile.
- Salon edit.
- Booking request.
- Provider accept/reject.

### Rollback Checklist

- Fresh prod DB dump.
- Upload backup if release touches upload or app storage.
- Previous app artifact/repo revision known.
- Restore command documented.
- Maintenance window approved.
- Smoke test owner assigned.

## Final Decision Summary

Recommended strategy: Option A now, with Option C as a later controlled baseline branch if needed.

Expected risk: moderate operational risk, low schema-shape risk. The dangerous part is accidentally applying a full baseline to an already-populated prod DB. Avoid that with baseline artifacts outside normal migrations until the resolve playbook is rehearsed.

Necessary next step: create the baseline artifact PR and fresh-install rehearsal script, then run it only on throwaway DBs.

Phase 2 dashboard restructure: yes, it can proceed for non-schema-changing work. Schema-changing dashboard features and production release should wait until baseline reconciliation is rehearsed.
