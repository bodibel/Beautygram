# GlowySpot Migration Repair Plan

## 1. Strategy Decision

### Chosen approach: baseline migration strategy

The migration repair strategy for GlowySpot should use a **baseline migration approach**, not a repair-by-extending the current migration chain.

### Why baseline is chosen

- `prisma/schema.prisma` is already the accepted target truth.
- The committed migration chain is incomplete and does not recreate the accepted schema from scratch.
- The staged database currently reflects the outdated migration chain, not the accepted schema target.
- The live/source database is closer to the intended structure, but it is not a safe migration source-of-truth because it is:
  - not version-controlled
  - historically drifted
  - tied to existing test/staging data
- Trying to “repair” the old migration chain incrementally would force future work to preserve historical mistakes and partial steps that no longer represent the intended system.
- A baseline approach gives the repository a clean, explicit “fresh database from repo” story, which is the correct long-term deployment expectation.

### Why migration chain repair is not chosen

- The current chain is not only missing one or two follow-up migrations; it fails to represent multiple target-schema elements already accepted as required.
- Extending the old chain would create a brittle history that still depends on an inaccurate earlier foundation.
- It would increase the risk of future fresh environments matching the wrong shape again.

## 2. Current State Diagnosis

### Current mismatch summary

- `prisma/schema.prisma`
  - accepted target truth
  - closest representation of the intended system

- committed migrations
  - incomplete and outdated
  - do not fully materialize the accepted schema
  - currently include:
    - `20260117222519_add_category_model`
    - `20260118104042_add_contact_preferences`
    - `20260118110618_add_granular_notifications`
    - `20260420214500_add_audit_log_model`

- staged database
  - largely reflects committed migrations
  - therefore behind the accepted target schema

- live/source database
  - closer to the current accepted schema than staged
  - but not safe to treat as the version-controlled migration source

## 3. Target State

A correct post-repair system should look like this:

- a fresh database created from repository migrations matches `prisma/schema.prisma` exactly
- staged environments can be rebuilt reproducibly from repo state
- future migrations start from a clean, trustworthy baseline
- deployment expectations are clear:
  - repo defines the schema
  - migrations reproduce the schema
  - staging is disposable/rebuildable
  - live is updated only through deliberate, controlled deployment steps

## 4. Migration Repair Approach

### Step 1: lock the accepted target schema

- Treat the already accepted `prisma/schema.prisma` as the target schema definition.
- Do not infer the target from the staged database.
- Do not infer the target from the live database.

### Step 2: create a new baseline migration conceptually

- Create a new migration baseline that represents the accepted target schema in one coherent starting point.
- This baseline should be able to create a fresh database that matches the target schema without depending on the incomplete historical chain.
- The baseline should include all accepted keep-in-target elements and exclude only items that are intentionally deferred or intentionally not part of the target.

### Step 3: retire the old migration chain as an authoritative build path

- Existing migrations should no longer be treated as the canonical way to build a new environment.
- The old migration chain should be preserved only as historical context if needed, but not as the foundation for future fresh environments.
- The repository must clearly converge on one authoritative path: fresh DB from baseline + future forward migrations.

### Step 4: rebuild staging from the repaired repo migration state

- After the baseline is prepared and accepted, staging should be rebuilt from that repaired migration state.
- Staging should not be “patched forward” from its current drifted shape.
- Staging should become the first proof that:
  - repo migrations create the correct schema
  - app startup assumptions match the rebuilt schema

### Step 5: resume normal future migration flow

- After baseline repair, all future schema changes should use standard forward migrations from the repaired baseline.
- No more hidden/manual schema drift should be tolerated.
- Fresh environments must always be reproducible from repo alone.

## 5. Staging Handling Strategy

### Planned staging treatment

- The staged database should be treated as rebuildable.
- The recommended approach is:
  - reset staged DB conceptually
  - rebuild staged DB from the repaired baseline

### Why this is the correct staging path

- The current staged DB reflects the wrong source of truth: outdated migrations.
- Keeping it and trying to patch around drift would make staging less trustworthy, not more.
- Staging exists specifically to validate deployment-safe reproducibility.

### Important limitation

- This document is planning only.
- No destructive staging action is being approved or executed here yet.

## 6. Live DB Strategy

### Live DB position

- The live/source DB should **not** be the primary schema source of truth.
- It should also **not** be the first migration-repair target.

### Recommended live DB handling

- Treat the current live/source DB as **legacy/test data with operational value**, not as the schema authority.
- Do not attempt immediate live migration as part of migration repair.
- Align with the approved side-by-side deployment strategy:
  - current live deployment at `/opt/projects/glowyspot` remains protected
  - repaired repo + rebuilt staged DB should validate the new deployment path first
  - only after successful schema repair and staging validation should a separate decision be made about whether any live DB migration or selective import is even needed

### Practical consequence

- Migration repair is a repo-and-staging problem first.
- Live DB handling is a later controlled deployment/data decision.

## 7. Data Import Implications

- Data import is **BLOCKED** until schema alignment is complete.
- No import planning should proceed as if current staged schema were valid.
- Any future import must be:
  - selective
  - schema-safe
  - mapped against the accepted target schema
  - validated table-by-table

### Why import must wait

- Importing before schema reconciliation risks:
  - dropped fields
  - constraint failures
  - false confidence from partial imports
  - locking the system around the wrong structure

## 8. Risks

### If migration repair is done incorrectly

- fresh environments will still not match the intended app schema
- future developers will keep chasing drift instead of building features
- deployment confidence will remain low

### If baseline is skipped

- the repo will continue to depend on an inaccurate historical migration path
- staging rebuilds will remain unreliable
- “works on one DB, fails on another” behavior will continue

### If staged and live DB are mixed blindly

- test/staging data may be confused with deployment-safe schema validation
- old uploads/data assumptions may leak into new environments
- future cutover planning becomes much riskier

### If live DB is treated as canonical by accident

- manual or drifted structures may get re-encoded into repo history
- the repository may become a mirror of accidental state instead of deliberate design

## 9. Next Step After This Plan

The exact next task should be:

- **Create a baseline migration repair specification**

That next task should define, in repository terms only:

- what the new baseline migration set should contain
- how old migrations will be treated operationally
- how staging will be rebuilt from the repaired baseline
- how to validate that a fresh DB now matches `prisma/schema.prisma`

It should still avoid touching live data until staging schema reproduction is proven.

