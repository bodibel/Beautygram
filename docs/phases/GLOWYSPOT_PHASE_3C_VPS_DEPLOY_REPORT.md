# GlowySpot Phase 3C VPS Deploy Report

Date: 2026-06-06

## Deployed state

- Source: local `main` worktree from `C:\Dev\Glowyspot`
- Base commit: `35922ecf200684e6fe7cff14ca62684df4668883`
- Important note: the deployed state includes the current uncommitted/untracked Phase 1-3 worktree, not only the last Git commit.
- Release package: `C:\Dev\Glowyspot\.codex-logs\glowyspot_phase3c_20260606_133942.tar.gz`
- Remote package: `/tmp/glowyspot_phase3c_20260606_133942.tar.gz`
- Package SHA256: `BD05852DABE5664D63D0A8DE67854207E51238C44EBDA7D87CD307214BE3E5E6`

## Safety constraints

- Prisma schema was not modified during deploy.
- No Prisma migration was run.
- `prisma db push` was not run.
- Production/dev databases were not reset.
- Remote `.env`, `.env.next`, DB storage, and upload storage were excluded from source sync.
- DB access during smoke was read-only `SELECT` for public salon slug discovery.

## Local verification before deploy

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test:run`: passed, 74 tests
- `npm run build`: passed
- Additional Docker-platform check: `docker run --rm -v "${PWD}:/app" -w /app node:20-alpine sh -lc "npm ci --dry-run"` passed after lockfile reconciliation.

## Lockfile note

The first VPS Docker build failed at `npm ci` because Linux optional dependencies expected by the clean Docker install were missing from `package-lock.json`:

- `@emnapi/runtime@1.10.0`
- `@emnapi/core@1.10.0`

Fix applied locally:

- `npm install --package-lock-only`
- Linux container lock reconciliation with `node:20-alpine`

No `npm audit fix`, no `--force`, and no package upgrade strategy was applied.

## Backup paths

Development environment:

- Pre-deploy rollback backup: `/opt/projects/glowyspot-next_backup_20260606_133445`
- Later retry backups: `/opt/projects/glowyspot-next_backup_20260606_133716`, `/opt/projects/glowyspot-next_backup_20260606_133942`
- Backed up files: repo code tarball, `docker-compose.side-by-side.yml`, `.env.next`

Current main domain environment:

- Rollback backup: `/opt/projects/glowyspot_backup_20260606_133942`
- Backed up files: app code tarball, `docker-compose.vps.yml`, `docker-compose.yml`, `.env`

## Deploy targets

### Development

- Domain: `https://dev.glowyspot.com`
- Root: `/opt/projects/glowyspot-next`
- App build context: `/opt/projects/glowyspot-next/repo`
- Compose file: `/opt/projects/glowyspot-next/docker-compose.side-by-side.yml`
- Env file preserved: `/opt/projects/glowyspot-next/.env.next`
- Containers:
  - `glowyspot-next-web`: rebuilt and restarted
  - `glowyspot-next-db`: unchanged
- Storage preserved:
  - `/opt/projects/glowyspot-next/storage/postgres`
  - `/opt/projects/glowyspot-next/storage/uploads`

### Current main domain

- Domain: `https://glowyspot.com`
- Root/build context: `/opt/projects/glowyspot`
- Compose file: `/opt/projects/glowyspot/docker-compose.vps.yml`
- Env file preserved: `/opt/projects/glowyspot/.env`
- Containers:
  - `glowyspot-web`: rebuilt and restarted
  - `glowyspot-db`: unchanged
- Storage preserved:
  - `/opt/projects/glowyspot/data/postgres`
  - `/opt/projects/glowyspot/public/uploads`

## Build results

Development:

- Docker image `glowyspot-next-web:latest` built successfully.
- Container recreated and started.
- Runtime log: `Next.js 16.2.6`, ready.

Current main domain:

- Docker image `glowyspot-glowyspot-web:latest` built successfully.
- Container recreated and started.
- Runtime log: `Next.js 16.2.6`, ready.

Build warning observed in both environments:

- During static `/providers` generation, Prisma logged `ECONNREFUSED` for `Salon`/`Category` fetches.
- The build still completed successfully.
- This is not a migration failure, but it should be cleaned up later by making `/providers` dynamic or preventing build-time DB fetch fallback noise.

## Container status after deploy

- `glowyspot-web`: up, image `glowyspot-glowyspot-web`
- `glowyspot-db`: up, image `postgres:15-alpine`
- `glowyspot-next-web`: up, image `glowyspot-next-web`
- `glowyspot-next-db`: up, image `postgres:15-alpine`

## HTTP smoke results

### `https://dev.glowyspot.com`

- `/`: `200`
- `/providers`: `200`
- `/profile/glamour-szalon`: `200`
- `/dashboard`: `307 -> /?authRequired=true`
- `/dashboard/provider`: `307 -> /?authRequired=true`
- `/dashboard/salons`: `307 -> /?authRequired=true`
- `/dashboard/messages`: `307 -> /?authRequired=true`
- `/salon/cmkr0wy140029s1lh9unwq4df`: `307 -> /?authRequired=true`
- Home page contains login trigger text.
- Home page includes Next CSS assets.

### `https://glowyspot.com`

- `/`: `200`
- `/providers`: `200`
- `/profile/glamour-szalon`: `200`
- `/dashboard`: `307 -> /?authRequired=true`
- `/dashboard/provider`: `307 -> /?authRequired=true`
- `/dashboard/salons`: `307 -> /?authRequired=true`
- `/dashboard/messages`: `307 -> /?authRequired=true`
- `/salon/cmkr0wy140029s1lh9unwq4df`: `307 -> /?authRequired=true`
- Home page contains login trigger text.
- Home page includes Next CSS assets.

## Modified/uploaded scope

Uploaded source package excluded:

- `.env`, `.env.*`
- `.git`
- `node_modules`
- `.next`
- `data`
- `storage`
- `public/uploads`
- `test-results`
- `playwright-report`
- local logs and archives

The deploy sync replaced app source files with the current local MVP worktree and removed stale source files through `rsync --delete`, while preserving env and persistent storage.

## Rollback

Rollback is not currently required.

If rollback is needed:

1. Stop the affected web container.
2. Restore the saved code tarball from the matching backup directory.
3. Restore the matching compose/env file copy if needed.
4. Rebuild/restart only the affected web container.
5. Do not touch DB volumes unless a separate DB rollback is explicitly planned.

## Remaining blockers / follow-up

- `/providers` currently logs DB connection warnings during Docker build static generation. Priority: P2, not a deploy blocker.
- Full authenticated browser smoke on remote domains was not run in this deploy pass because no remote fixture credential flow was executed.
- Google OAuth callback/domain configuration should be manually verified on both domains before broader external testing.
- Existing `npm audit` security findings remain from earlier phases and were not changed by this deploy.

## Recommended next step

Run a remote-domain manual MVP smoke pass:

- Google/email login
- `/dashboard/account`
- `/dashboard/provider`
- `/dashboard/salons`
- `/dashboard/salons/[salonId]/*`
- booking request create/accept
- messages with `?salon=`
- upload path with moderation behavior

