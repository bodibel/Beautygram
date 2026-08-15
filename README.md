# GlowySpot

Szépségipari szalonkereső és -kezelő platform. A látogatók szalonokat és szolgáltatásokat böngésznek és időpontot kérnek, a szolgáltatók saját szalonkonzolon kezelik a profiljukat, szolgáltatásaikat, portfóliójukat és a foglalási kérelmeket.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Prisma 6 + PostgreSQL · NextAuth v4 · Tailwind CSS 4

---

## Gyors indítás

Előfeltétel: Node.js 20+ (fejlesztve: 24.x) és Docker.

```bash
npm install
```

```bash
cp .env.production.example .env
```

Töltsd ki a `.env`-et (lásd [Környezeti változók](#környezeti-változók)). Lokális fejlesztéshez a `DATABASE_URL` hostja `localhost:5410` legyen, ne `glowyspot-db:5432`.

Indítsd az adatbázist:

```bash
docker compose up -d
```

Futtasd a migrációkat és a seedet:

```bash
npx prisma migrate deploy && npx prisma db seed
```

Indítsd a fejlesztői szervert:

```bash
npm run dev
```

Az alkalmazás a **http://localhost:3020** címen érhető el.

### Teszt fiókok (seed)

Minden seedelt fiók jelszava `password123`.

| Email | Szerepkör |
| --- | --- |
| `admin@glowyspot.com` | admin |
| `provider1@glowyspot.com` | provider |
| `visitor1@glowyspot.com` | visitor |

---

## Parancsok

| Parancs | Leírás |
| --- | --- |
| `npm run dev` | Fejlesztői szerver (port 3020) |
| `npm run dev:lowmem` | Fejlesztői szerver korlátozott memóriával |
| `npm run build` | Éles build |
| `npm start` | Éles szerver (port 3020) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript ellenőrzés |
| `npm run check` | Lint + typecheck együtt |
| `npm run test:run` | Vitest unit tesztek (egyszeri futás) |
| `npm run smoke:e2e` | Playwright smoke tesztek |
| `npm run e2e:mvp` | Seed + MVP folyamat E2E tesztek |

---

## Környezeti változók

A teljes, kommentezett lista: [`.env.production.example`](.env.production.example).

| Változó | Kötelező | Megjegyzés |
| --- | --- | --- |
| `DATABASE_URL` | igen | PostgreSQL kapcsolat |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | igen | A docker-compose ezeket használja |
| `DB_PORT` | nem | Host-oldali DB port, alapértelmezés `5410` |
| `NEXTAUTH_URL` | igen | Az alkalmazás publikus URL-je |
| `NEXTAUTH_SECRET` | igen | `openssl rand -base64 32` |
| `CRON_SECRET` | **igen** | Enélkül a `/api/cron/*` végpontok 401-et adnak (fail-closed) |
| `OPENAI_API_KEY` | igen | Képmoderálás; hiánya esetén a feltöltés elutasításra kerül (fail-closed) |
| `RESEND_API_KEY` / `EMAIL_FROM` | igen | Tranzakciós emailek |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | nem | Google bejelentkezéshez |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | nem | Térképes funkciókhoz |
| `GEMINI_API_KEY` | nem | AI segédfunkciókhoz |
| `UPLOAD_DIR` | nem | Docker esetén `/app/public`, lokálisan hagyd üresen |

---

## Szerepkörök és jogosultság

Három szerepkör van: `visitor`, `provider`, `admin`. Regisztrációval csak `visitor` és `provider` választható — az `admin` szerepkör kizárólag meglévő adminisztrátor által adható.

A jogosultság-ellenőrzés három rétegben történik:

1. **`proxy.ts`** – útvonalszintű szűrés (`/dashboard/*`, `/salon/*`). Next.js 16-ban ez a korábbi `middleware.ts` utódja.
2. **Layout guardok** – `app/dashboard/layout.tsx` (bejelentkezés), `app/dashboard/admin/layout.tsx` (admin), `app/salon/[id]/layout.tsx` (tulajdonos).
3. **Szerver action guardok** – `lib/auth-utils.ts` (`requireSession`, `requireAdminSession`, `requireActiveSessionUser`), valamint tulajdonosi ellenőrzések a `lib/actions/salon.ts`-ben.

A guardok az adatbázisból ellenőrzik a felhasználó `isActive` állapotát, tehát egy letiltott fiók régi JWT-vel sem használható.

### Fiók inaktiválás

A `User.deactivatedBy` mező különbözteti meg a két esetet:

- `"self"` – a felhasználó maga inaktiválta a fiókját. 30 napon belüli bejelentkezéskor automatikusan visszaáll.
- `"admin"` – adminisztrátori tiltás. **Bejelentkezéssel soha nem oldható fel**, csak admin állíthatja vissza.

### Szalon publikálási állapot

Egy szolgáltatónak több szalonja is lehet. A szalon **létrehozása mindig ingyenes**; a publikálást a `lib/salon-publishing.ts` házirendje engedélyezi.

A `Salon` három, egymástól független jelzőt használ, mindegyiknek pontosan egy írójával:

| Mező | Jelentés | Írója |
| --- | --- | --- |
| `isActive` | Fiókszintű állapot | Fiókműveletek (admin tiltás, felhasználói inaktiválás) |
| `isPublished` | A tulajdonos publikálási szándéka | A tulajdonos (`createSalon`, `publishSalon`, `unpublishSalon`) |
| `publishBlockedReason` | Rendszer általi tiltás (`"BILLING"` / `"ADMIN"`) | A rendszer (előfizetés lejárat, adminisztrátori intézkedés) |

Egy szalon akkor és csak akkor látható a látogatóknak, ha mindhárom feltétel teljesül. A láthatóság egyetlen helyen van definiálva: [`lib/salon-visibility.ts`](lib/salon-visibility.ts). Minden publikus lekérdezésnek a `PUBLIC_SALON_WHERE` töredéket kell használnia.

A `SubscriptionConfig.billingEnabled` a fizetési fázisok fő kapcsolója. Amíg `false` (1. fázis), sem az előfizetés-lejáratás, sem a csomagkorlátok nem érvényesülnek, és minden szalon ingyenesen publikálható.

---

## Eseménynapló (audit log)

Minden biztonsági szempontból lényeges esemény az `AuditLog` táblába kerül: bejelentkezés, sikertelen bejelentkezés (okkal), kijelentkezés, regisztráció, jelszó-visszaállítás, szerepkörváltás, fiók tiltása/feloldása/törlése, kategória- és szalonműveletek, üzenetküldés, fájlfeltöltés.

- Írás: `writeAuditLog()` a [`lib/audit-log.ts`](lib/audit-log.ts)-ben. Soha nem dob hibát, így a naplózás nem akaszthatja meg az üzleti műveletet.
- Az események azonosítói az `AUDIT_ACTIONS` konstansban vannak; új esemény felvételekor ide is fel kell venni.
- Megtekintés: **`/dashboard/admin/audit-log`** (csak admin), eseményre, felhasználóra és dátumra szűrve.

---

## Projektstruktúra

```
app/                  Next.js App Router route-ok
  api/                Route handlerek (auth, upload, files, cron)
  dashboard/          Bejelentkezett felület (admin, szalonkonzol)
  profile/, salon/    Publikus és kezelői szalonoldalak
components/           React komponensek (layout, dashboard, salon, ui)
lib/
  actions/            Szerver action-ök (auth, user, salon, category)
  auth/               Szerepkör- és jelszóházirend
  audit-log.ts        Eseménynaplózás
  auth-utils.ts       Szerver oldali session guardok
prisma/
  schema.prisma       Adatmodell
  migrations/         Érvényes migrációk (a baseline-tól)
  migrations_legacy_pre_baseline/   Archivált, baseline előtti migrációk
proxy.ts              Útvonalszintű auth/szerepkör guard
tests/                Vitest unit tesztek
tests/e2e/            Playwright E2E tesztek
docs/                 Fejlesztői dokumentáció — lásd docs/README.md
```

---

## Adatbázis-migrációk

Az érvényes migrációs előzmény a `20260422170000_authoritative_baseline` migrációtól indul. Az ez előtti migrációk a `prisma/migrations_legacy_pre_baseline/` mappában vannak archiválva — ezeket **nem szabad** visszamozgatni a `prisma/migrations/` alá, mert az előzmény-eltérést okoz.

```bash
npx prisma migrate status
```

---

## Dokumentáció

A fejlesztői dokumentáció a [`docs/`](docs/) mappában található, tematikus bontásban. Kezdd a [`docs/README.md`](docs/README.md) indexszel.
