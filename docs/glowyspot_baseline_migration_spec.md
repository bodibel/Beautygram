# GlowySpot Baseline Migration Repair Specification

## 1. Goal

The goal of the baseline migration repair is to restore a trustworthy repository-driven schema path for GlowySpot.

After this repair:

- `prisma/schema.prisma` remains the accepted schema truth
- repository migrations become a reliable fresh-build path again
- a new database created from repo state should match the accepted schema exactly
- staging can be rebuilt reproducibly from repository state
- future schema changes can resume through normal forward migrations

This specification is planning only. It does not authorize schema edits, migration edits, database changes, or Prisma command execution yet.

## 2. Baseline Strategy In Repo Terms

### Conceptual repo-level outcome

The repository should move from:

- `schema.prisma` as truth
- incomplete historical migrations as broken build path

to:

- `schema.prisma` as truth
- a new baseline migration path as the authoritative fresh-build path
- future migrations layered forward from that baseline

### What “baseline” means here

In repository terms, the new baseline should be a migration representation of the already accepted target schema, not a replay of the historically drifted evolution.

The baseline should conceptually become:

- the migration starting point for fresh environments
- the canonical schema reproduction path for staging and future deployment preparation

### Why this baseline must supersede the old chain operationally

- the existing migration folders do not recreate the accepted schema
- the staged database currently proves that the old chain is not trustworthy
- continuing to treat the old chain as authoritative would keep the repo non-reproducible

## 3. Old Migration Handling

### Operational treatment of existing migration folders

The current migration folders should be treated as:

- preserved for historical reference
- superseded as the authoritative fresh-build path

They should **not** remain the primary “build a fresh DB” route after repair.

### What this means in practice

- implementation work should not try to patch the old chain into correctness one folder at a time
- implementation work should define a new authoritative baseline path
- the old folders may remain in repository history/context, but operational ownership shifts to the new baseline-driven migration path

### Important constraint

- this specification does not approve deleting, editing, or renaming old migration folders yet
- it only defines how they should be treated during the upcoming implementation task

## 4. New Baseline Contents

### What the baseline must represent

The new baseline must represent the accepted target schema, as formalized in `docs/glowyspot_target_schema_decision.md`.

At minimum, that means it must include the currently accepted keep-in-target schema elements, including:

- `User.createdAt`
- `User.updatedAt`
- `Salon.slug`
- `Salon.salonFingerprint`
- active salon contact/display fields
- `Post.layout`
- `Message.salonId`
- `Subscription`
- `SubscriptionConfig`
- `PasswordResetToken`
- `AuditLog`

### How it relates to `prisma/schema.prisma`

- the baseline must be derived from the accepted target schema definition
- it must not be derived from the staged DB
- it must not be reverse-justified from the live/source DB alone
- the implementation must validate that the baseline and `schema.prisma` describe the same intended schema

### Deferred items that are not fully locked by this baseline

The baseline must not silently hard-finalize unresolved product decisions beyond the already accepted repo direction.

Still deferred:

- `Post.videos`
- full `notify*` field strategy
- exact depth of subscription schema

Implementation consequence:

- if these fields/models already exist in the accepted `schema.prisma`, they should be handled consistently with the accepted target schema
- but the implementation task must not expand them into new product commitments or invent deeper behavior

## 5. Staging Rebuild Plan

### How staging should be treated

The staged database should be treated as rebuildable infrastructure, not as something to preserve for correctness.

### Rebuild concept

After the baseline exists:

- staged DB should be considered disposable
- staged DB should be rebuilt from the repaired repo migration state
- staged app startup should then be validated against that rebuilt schema

### Why staging rebuild is required

- the current staged DB reflects outdated migrations
- it is not proof of correct schema reproduction
- continuing from the current staged shape would keep drift ambiguity alive

### Important planning boundary

- this specification does not approve destructive staging commands yet
- it only establishes that staging rebuild is the required operational direction after baseline implementation

## 6. Validation Plan

### Validation objective 1: fresh DB matches `schema.prisma`

The implementation task should validate that a fresh database created purely from repo migration state matches the accepted schema intent.

Validation should confirm:

- expected tables exist
- expected columns exist
- expected nullability/default/constraint shape is present at a practical level
- target keep-in-schema items are all represented

### Validation objective 2: staged app starts against rebuilt schema

After staging is rebuilt from the repaired migration path, the staged app should be able to:

- connect to the rebuilt DB
- complete Prisma client boot expectations
- start without schema mismatch errors

### Validation objective 3: future migrations are trustworthy again

The repaired repo state should support the assumption that:

- fresh DB from repo = accepted target schema
- future schema changes can be added as normal forward migrations
- staging remains reproducible from repo, not from accidental DB history

## 7. Live DB Implications

### Live/test DB treatment during this process

The live/source DB should be treated as:

- valuable legacy/test data
- operationally sensitive
- not the first repair target

### Explicit rule

Live/test DB is **NOT** the first migration repair target.

### Why

- the approved deployment posture is side-by-side and conservative
- repo reproducibility must be repaired before any live alignment work is attempted
- live DB state should not be allowed to redefine repository history

### Practical implication

The implementation task that follows this spec must stay focused on:

- repo migration repair
- rebuilt staging validation

and must not mix in live DB migration or live data conversion work.

## 8. Follow-Up Task Definition

### Exact next implementation task

The next task after this specification should be:

**Implement the baseline migration repair in repository form**

That future execution task should include:

- prepare the repository migration set so a new authoritative baseline exists
- define operational treatment of old migration folders in the repo
- align the repo migration path with the accepted target schema
- prepare the repo so staging can later be rebuilt from that repaired migration path
- add documentation/comments only where needed to make the new migration authority unambiguous

### Boundaries for that next task

It should:

- work in repository files only
- avoid touching the live/source DB
- avoid data import work
- avoid product/schema redesign beyond the already accepted target direction

It may later be followed by a separate task for staged rebuild execution and validation.

## 9. Safety Rules

During actual implementation of the baseline repair, the following must not be done:

- do not use `db push` as a shortcut
- do not blindly rewrite migration history without an explicit authoritative baseline plan
- do not treat the current staged DB as proof of correctness
- do not treat the live/source DB as the migration source of truth
- do not run destructive commands against the live/source DB
- do not mix schema repair with data import
- do not reuse live/test DB or uploads as a shortcut for staging validation

Additional protection rules:

- live deployment at `/opt/projects/glowyspot` remains protected
- staged rebuild validation should happen in the approved side-by-side environment
- data import remains blocked until schema alignment is completed and accepted

