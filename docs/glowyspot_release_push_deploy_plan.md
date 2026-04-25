# GlowySpot Release, Git Push, and VPS Deploy Plan

Last updated: 2026-04-25

## Purpose

This plan defines the practical path from the current local working state to:

- a clean repository snapshot
- a controlled Git push
- a safe VPS deployment update

It is intended to be followed step-by-step. Do not skip verification gates.

## Core Rules

- Do not push local secrets.
- Do not commit local logs, screenshots, or ephemeral debug artifacts.
- Do not overwrite the live VPS deployment in place.
- Do not reuse the live DB or live uploads blindly for a new staged deploy.
- Do not treat local success as sufficient for deployment readiness without a targeted smoke pass.

## Phase 1: Local Repository Stabilization

Goal: get the local repo into a reviewable, versionable state.

### 1.1 Review git status

Check:

- tracked modified files
- newly created files
- deleted migration files
- temporary files that should not be versioned

Command:

```bash
git status --short
```

Gate:

- no accidental `.env`
- no local logs
- no screenshot/debug captures
- no unreviewed binary junk

### 1.2 Separate intended changes from noise

Review and keep only:

- real app fixes
- docs
- accepted migration-repair files
- accepted deployment scaffolding

Exclude:

- local `*.log`, `*.out`, `*.err`
- ad hoc screenshots
- local-only temp captures

Current repo note:

- `.gitignore` should cover temporary local logs and screenshot artifacts before staging

### 1.3 Review Prisma/migration state before commit

Because this repo has baseline migration repair work, verify:

- `prisma/schema.prisma` matches the accepted target direction
- `prisma/migrations/20260422170000_authoritative_baseline/` is present and intended
- archived legacy migrations remain clearly separated
- deleted historical migration folders are intentional, not accidental

Gate:

- migration authority must remain unambiguous

### 1.4 Run static verification locally

Minimum:

```bash
npm run build
```

Optional if needed:

```bash
npm run lint
```

Gate:

- build passes
- known warnings may be documented, but no blocking compile/type errors remain

## Phase 2: Commit Preparation

Goal: create a clean commit set for the current milestone.

### 2.1 Stage intentionally

Do not blindly stage everything until noise is excluded.

Recommended review flow:

```bash
git diff --stat
git diff -- <important file>
git add <reviewed files>
```

### 2.2 Commit strategy

Prefer one clean milestone commit if the change set is cohesive.

If the set is too broad, split into:

- infrastructure/docs
- auth + UI fixes
- salon/dashboard/account improvements

Recommended commit message style:

- `chore: prepare stable auth and dashboard release snapshot`
- `fix: stabilize auth, profile, dashboard, and salon flows`
- `docs: add release and deploy execution plan`

Gate:

- commit message reflects the actual scope
- commit excludes local-only junk

## Phase 3: Git Push

Goal: publish the reviewed branch safely.

### 3.1 Confirm branch

Check current branch:

```bash
git branch --show-current
```

If working on a local-only or ambiguous branch, create a clear branch first:

```bash
git checkout -b codex/release-prep-2026-04-25
```

### 3.2 Push

Push after commit:

```bash
git push -u origin <branch-name>
```

### 3.3 Optional PR step

If using GitHub review flow:

- open a PR
- summarize:
  - Google auth fix
  - popup/modal cleanup
  - profile/account/dashboard alignment
  - salon dashboard/messages fixes
  - release hygiene/docs updates

Gate:

- remote branch exists
- pushed diff matches intended scope

## Phase 4: Pre-Deploy VPS Readiness Check

Goal: confirm VPS deploy prerequisites before touching staging/live deployment.

### 4.1 Confirm target strategy

Use side-by-side deployment only.

Current known paths:

- live: `/opt/projects/glowyspot`
- staged/new: `/opt/projects/glowyspot-next`

Do not deploy over `/opt/projects/glowyspot` directly.

### 4.2 Confirm VPS env readiness

Before deploy/update:

- Docker available
- compose file available
- production `.env` present only on VPS
- `NEXTAUTH_URL` matches target domain
- Google OAuth redirect URIs include the target domain
- `CRON_SECRET` set
- upload persistence path prepared

### 4.3 Confirm DB strategy

For staged updates:

- do not point to live DB blindly
- use the accepted staged DB path/process
- use migration-based changes only
- no `db push`
- no reset on valuable environments

Gate:

- DB target is explicit
- upload path target is explicit

## Phase 5: VPS Deployment Execution

Goal: update the staged VPS deployment in a controlled way.

### 5.1 Pull updated code onto VPS

In staged repo path:

```bash
cd /opt/projects/glowyspot-next/repo
git fetch origin
git checkout <branch-or-tag>
git pull --ff-only
```

If the VPS staged repo is tied to a release branch, use that branch consistently.

### 5.2 Review VPS env before rebuild

Check without printing secrets:

- `.env.next` or target env file exists
- `NEXTAUTH_URL` is correct for the staged/dev hostname
- Google OAuth redirect URI for staged domain is configured
- upload path mount exists
- DB target is staged, not live

### 5.3 Build and restart staged stack

Typical flow:

```bash
docker compose -f docker-compose.side-by-side.yml build
docker compose -f docker-compose.side-by-side.yml up -d
```

If image rebuild is required from scratch, do it only in the staged path.

### 5.4 Apply safe migrations if needed

Only if the deployment requires repo migrations and the target DB is the staged DB:

```bash
docker compose -f docker-compose.side-by-side.yml exec glowyspot-next-web npx prisma migrate deploy
```

Never run destructive migration commands on live.

### 5.5 Check staged logs

Inspect:

- web container logs
- auth callback behavior
- Prisma startup errors
- upload path permission issues

## Phase 6: Staged Smoke Test

Goal: verify staged deployment before any cutover.

Minimum smoke checklist:

- homepage loads
- email/password login works
- Google login works on staged domain
- logout works
- provider dashboard loads
- salon dashboard pages load
- salon-scoped messages page loads
- profile page loads
- booking history page loads
- uploads work
- modal/popups render correctly
- no auth callback/query noise remains after login

Gate:

- all core flows pass on staging
- any remaining issue is documented and accepted before cutover

## Phase 7: Cutover Decision

Goal: decide whether production/live routing should change.

Do not cut over if:

- staged auth is unstable
- staged DB target is unclear
- uploads are not persistent
- Prisma state is still ambiguous
- critical smoke test failures remain

Proceed only when:

- staged stack is verified
- rollback path is known
- live deployment remains untouched until the switch point

## Recommended Immediate Next Execution Order

1. Clean git status and exclude local junk
2. Review migration-related changes carefully
3. Run `npm run build`
4. Stage and commit the intended release snapshot
5. Push branch to GitHub
6. Review the pushed diff remotely
7. Pull the exact branch onto VPS staged repo
8. Rebuild/restart staged stack
9. Run staged smoke tests
10. Decide on cutover only after staged verification

## Suggested Follow-Up Tasks After This Plan

- create a release checklist issue or PR template for future pushes
- document the exact Google OAuth settings for local, staging, and production domains
- document the exact staged deploy command set used successfully on the VPS
- optionally tag the first stable pre-release snapshot after staging verification
