# GlowySpot VPS Deployment Guide

Last reviewed: 2026-04-22

## 1. Scope

This guide is for a single Linux VPS deployment of GlowySpot using Docker and PostgreSQL.

It covers:

- required prerequisites
- production environment variables
- Docker build/run approach
- Prisma migration steps
- upload persistence
- reverse proxy/domain awareness
- post-deploy smoke testing

It does not cover:

- CI/CD
- object storage migration
- multi-node orchestration

## 2. Current deployment scaffolding in the repo

The repository already contains usable deployment-oriented files:

- `Dockerfile`
- `docker-compose.vps.yml`
- `.dockerignore`

These are sufficient for a controlled single-VPS Docker deployment, with manual VPS setup still required for:

- domain and TLS
- reverse proxy
- production `.env`
- persistent filesystem mounts
- Prisma migration execution

## 3. Prerequisites

Prepare the VPS with:

- Linux server with Docker Engine and Docker Compose plugin installed
- a DNS record pointing your domain to the VPS
- a reverse proxy strategy
  - example: Nginx, Traefik, Caddy, or an existing proxy host
- a writable persistent directory for:
  - PostgreSQL data
  - uploaded files
- valid production credentials for:
  - NextAuth
  - Google OAuth
  - Google Maps browser key
  - OpenAI
  - Resend

Recommended baseline:

- Node is not required on the host if you build/run through Docker only
- firewall open for:
  - 80/443 to the reverse proxy
  - internal container networking only for app/db where possible

## 4. Required environment variables

Use `.env.vps.example` as the starting point for the VPS `.env` file.

Required keys:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`
- `UPLOAD_DIR`

Notes:

- `NEXTAUTH_URL` must match the real public domain, for example `https://glowyspot.example.com`
- `DATABASE_URL` in Docker should point to the Postgres service name, currently `glowyspot-db`
- `UPLOAD_DIR` should stay `/app/public` with the current compose mount
- do not commit the VPS `.env` file

## 5. Local/dev env vs production env

Local/dev:

- use `.env.example` as the local baseline
- local database may run via `docker compose up -d glowyspot-db`
- local uploads default to `./public/uploads` when `UPLOAD_DIR` is unset
- local auth URL is usually `http://localhost:3000`

Production:

- use `.env.vps.example` only as a template
- create a real `.env` on the VPS host
- set `NEXTAUTH_URL` to the public HTTPS domain
- set `UPLOAD_DIR="/app/public"`
- ensure Docker volume mounts persist both database files and uploads

## 6. Build and run approach

The current `Dockerfile` is a multi-stage build:

- installs dependencies
- generates Prisma client
- builds the Next.js app
- runs the app with `npm start` in production mode on port `3000`

The current `docker-compose.vps.yml` defines:

- `glowyspot-db` for PostgreSQL
- `glowyspot-web` for the Next.js app
- a bind mount for uploads:
  - `./public/uploads:/app/public/uploads`

Important current expectation:

- `docker-compose.vps.yml` uses an external Docker network named `proxy_net`

If your VPS already uses a reverse proxy stack on `proxy_net`, keep it.
If not, either:

- create that external network before first deploy, or
- adapt the compose file manually on the VPS to your real proxy/network setup

## 7. Suggested VPS deployment steps

### 7.1 Copy code to the VPS

Example:

```bash
git clone <your-repo-url> glowyspot
cd glowyspot
```

### 7.2 Create the production env file

```bash
cp .env.vps.example .env
```

Then replace every placeholder with real values.

### 7.3 Prepare persistent directories

The current compose file expects host directories for:

- `./data/postgres`
- `./public/uploads`

Create them before first run:

```bash
mkdir -p data/postgres public/uploads
```

### 7.4 Prepare the reverse proxy network

If you keep the current compose file unchanged:

```bash
docker network create proxy_net
```

Only do this once per host.

### 7.5 Build and start containers

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

### 7.6 Apply Prisma migrations

After the app and database containers are up, run:

```bash
docker compose -f docker-compose.vps.yml exec glowyspot-web npx prisma migrate deploy
```

Optional Prisma client regeneration is already handled in the image build.

### 7.7 Optional seed step

Only if you intentionally want seed data in that environment:

```bash
docker compose -f docker-compose.vps.yml exec glowyspot-web npx prisma db seed
```

Do not run seed blindly on a live environment.

## 8. Prisma production note

Production migration rule:

- use `npx prisma migrate deploy`
- do not use `prisma migrate dev` on the VPS

Before actual deployment:

- confirm the committed migrations match `prisma/schema.prisma`
- verify migrations apply cleanly to a fresh or staging database

Current repository state:

- Prisma schema exists at `prisma/schema.prisma`
- committed migrations exist under `prisma/migrations`
- audit log migration is already present and should be included in production migration execution

Manual attention item:

- `Booking.status` schema comment is outdated relative to current app logic and should not be treated as authoritative deployment documentation

## 9. Upload directory / filesystem note

GlowySpot currently stores uploads on the local filesystem.

Current behavior:

- upload API writes under `UPLOAD_DIR/uploads` when `UPLOAD_DIR` is set
- otherwise it writes under `./public/uploads`
- file serving reads from the same local filesystem path

For the current Docker/VPS setup:

- set `UPLOAD_DIR="/app/public"`
- keep the bind mount:
  - `./public/uploads:/app/public/uploads`

Implications:

- uploads survive container rebuilds only if the host directory is preserved
- ephemeral container-only storage is not enough
- this is not object storage and should be treated accordingly

## 10. Reverse proxy / domain note

The app is designed to run behind a reverse proxy that terminates TLS and forwards traffic to the web container on port `3000`.

Minimum expectations:

- the public domain resolves to the VPS
- HTTPS is enabled at the proxy layer
- the proxy forwards the original host and scheme correctly
- `NEXTAUTH_URL` exactly matches the public HTTPS URL

Generic reverse proxy responsibilities:

- route the domain to `glowyspot-web:3000`
- terminate TLS
- preserve forwarded headers
- optionally add request size limits appropriate for image uploads

If Google OAuth is enabled:

- the OAuth callback URL must match the production domain
- update the Google Cloud Console redirect URI accordingly

## 11. Cron note

The cron endpoints are now fail-closed and require a valid `CRON_SECRET`.

Before using cron jobs:

- set `CRON_SECRET` in production
- call cron endpoints with `Authorization: Bearer <CRON_SECRET>`

Do not expose those endpoints without the header.

## 12. Post-deploy smoke test checklist

After deployment, verify all of the following manually:

- app home page loads over the real domain
- login works
- logout works
- registration works
- first salon creation works for a new user
- public salon profile page loads
- contact message send works for an authenticated user
- appointment request creation works
- provider can see incoming requests
- provider can accept a request
- provider can reject a request
- user booking/request history page loads
- admin audit log page loads for an admin user
- image upload works and survives container restart
- cron endpoints reject missing/invalid secrets
- cron endpoints work with a valid secret

## 13. What is ready vs what still needs manual setup

Ready in the repo:

- production Dockerfile
- VPS-focused compose file
- env examples
- Prisma schema and migrations in repo
- upload persistence pattern documented
- reverse proxy expectations documented

Still manual on the VPS:

- create the real `.env`
- provision DNS and TLS
- provision or join the reverse proxy network
- run the first deploy
- run Prisma migrations
- create any admin account needed for operations
- perform the smoke test checklist

