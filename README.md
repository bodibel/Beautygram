# GlowySpot

GlowySpot is a `Next.js 16 + React 19 + Prisma + PostgreSQL` beauty discovery platform focused on provider onboarding, public salon discovery, simple contact messaging, and appointment requests.

## Stack

- Next.js 16
- React 19
- TypeScript
- Prisma + PostgreSQL
- NextAuth
- Tailwind CSS
- Resend
- OpenAI image moderation/relevance checks
- Google Maps Places API

## What is in scope today

- public discovery feed
- public provider/salon profile pages
- provider onboarding and salon management
- simple contact messaging
- appointment request flow
- admin audit log foundation

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Start PostgreSQL.

- You can run the local database with Docker Compose:

```bash
docker compose up -d glowyspot-db
```

4. Apply Prisma migrations:

```bash
npx prisma migrate dev
```

5. Optional: seed the database:

```bash
npx prisma db seed
```

6. Start the app:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Environment variables

Use `.env.example` as the source of truth for required local variables.

Important keys:

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
- `UPLOAD_DIR` (optional)

## Prisma and migrations

- Prisma schema lives in `prisma/schema.prisma`
- Committed migrations live in `prisma/migrations`
- Before pushing deployment-related changes, verify migrations apply cleanly against a fresh database

Useful commands:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma generate
npx prisma studio
```

## Run and build commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Upload and local storage note

The current upload flow stores image files on the local filesystem and serves them from `/public/uploads` or from `UPLOAD_DIR/uploads`.

Implications for deployment:

- local uploads are not object storage
- the upload directory must be writable by the app process
- uploaded files must be mounted/persisted separately on VPS or Docker deployments
- ephemeral container storage is not sufficient if uploads must survive restarts

The current VPS compose file already mounts:

- `./public/uploads:/app/public/uploads`

Keep that behavior in mind before deployment. This repository does not yet include a cloud object-storage integration.

## Deployment note

This repository includes Docker-related files for later VPS deployment, but this README does not claim the project is production-ready by default.

Before VPS deployment, at minimum verify:

- env variables are set correctly
- Prisma migrations apply successfully
- auth flows work against the target domain
- upload directory persistence is configured
- cron secret is configured
- email and moderation integrations are valid in the target environment

## Repository hygiene note

- Do not commit real `.env` files
- Do not commit `public/uploads`
- Do not commit local database or build artifacts
