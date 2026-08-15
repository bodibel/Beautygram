# GlowySpot Phase 3A - Playwright Smoke Setup & MVP Route Verification

Datum: 2026-06-05

## Cel

Phase 3A celja a Phase 2A-2F utani dashboard es salon console route-ok valodi bongeszos smoke ellenorzese volt. Nem tortent Prisma schema modositas, migration, production/VPS muvelet vagy uj feature fejlesztes.

## Playwright setup allapota

- Playwright hozzaadva minimalis Chromium smoke futtatasra.
- Uj npm script: `npm run smoke:e2e`.
- Konfiguracio: `playwright.config.ts`.
- Alap `baseURL`: `E2E_BASE_URL`, fallback: `http://localhost:3000`.
- Headless Chromium az alapertelmezett.
- Artifactok:
  - `test-results/playwright-artifacts`
  - `playwright-report`
- Generated artifact mappak `.gitignore` es ESLint ignore ala kerultek.

## Fixture strategia

Az MVP smoke jelenleg read-only DB fixture lookupot hasznal:

- `tests/e2e/utils/fixtures.ts`
- DB URL forras: `E2E_DATABASE_URL`, fallback: `DATABASE_URL`.
- A fixture helper csak olvas:
  - provider sajat aktiv salon
  - masik provider aktiv salon
  - service darabszam
  - pending booking darabszam
  - salonhoz kotheto message darabszam

Teszt felhasznalok:

- visitor: `visitor1@glowyspot.com`
- provider sajat szalonnal: `provider1@glowyspot.com`
- masik provider: `provider2@glowyspot.com`
- provider szalon nelkul: `provider.single@glowyspot.com`
- admin: `admin@glowyspot.com`
- jelszo: `E2E_TEST_PASSWORD`, fallback: `password123`

Fontos: ez a kor nem ir seed adatot es nem helyettesiti a kesobbi izolalt DB fixture / Playwright e2e suite-ot. Pending booking, salon-scoped message thread es inactive user teljes flow-ja kesobbi dedikalt fixture kort igenyel.

## Automatizalt smoke tesztek

Fajl: `tests/e2e/glowyspot-smoke.e2e.ts`

Automatizaltan lefedve:

- logged-out `/dashboard` redirect
- logged-out `/dashboard/admin/overview` redirect
- logged-out `/dashboard/salons/[salonId]` redirect
- visitor `/dashboard` elerheto
- visitor admin route tiltva
- visitor salon console route tiltva
- provider `/dashboard/provider` elerheto
- provider `/dashboard/salons` elerheto
- provider sajat uj salon console route-ok:
  - `/dashboard/salons/[salonId]`
  - `/dashboard/salons/[salonId]/bookings`
  - `/dashboard/salons/[salonId]/profile`
  - `/dashboard/salons/[salonId]/services`
  - `/dashboard/salons/[salonId]/portfolio`
  - `/dashboard/salons/[salonId]/hours`
  - `/dashboard/salons/[salonId]/team`
- regi salon console kompatibilitas:
  - `/salon/[id]`
  - `/salon/[id]/bookings`
  - `/salon/[id]/settings`
  - `/salon/[id]/services`
  - `/salon/[id]/posts`
  - `/salon/[id]/hours`
  - `/salon/[id]/team`
- `/dashboard/salons/[salonId]/messages` redirect:
  - cel: `/dashboard/messages?salon=[salonId]`
- altalanos `/dashboard/messages` betolt
- admin `/dashboard/admin/overview` elerheto
- admin nem kap implicit salon console ownership hozzaferest
- provider nem fer hozza masik provider salon console-jahoz

## Javitasok smoke kozben

### Hero CSS build/dev bug

Erintett fajl:

- `components/home/hero-banner.tsx`

Problema:

- Tailwind arbitrary background-url class ampersanddel dev szerveren webpack/CSS feloldasi hibat okozott: `Cannot find module './&'`.

Javitas:

- A kulso Unsplash URL `style={{ backgroundImage: ... }}` formatumra kerult.
- Ez minimalis bugfix volt, adatmodell vagy feature valtozas nelkul.

### Playwright navigacio stabilitas

Erintett fajl:

- `tests/e2e/glowyspot-smoke.e2e.ts`

Problema:

- Next dev szerveren gyors egymas utani route navigacioknal egyes `page.goto(..., waitUntil: "load")` hivasok `net::ERR_ABORTED` hibaval szakadtak meg.

Javitas:

- `gotoSmokeRoute()` helper:
  - `waitUntil: "domcontentloaded"`
  - egyszeri retry `net::ERR_ABORTED` eseten

Ez nem rejti el a route hibakat: a tesztek tovabbra is URL-t es lathato oldal-szoveget ellenoriznek.

## Eredmenyek

Lefuttatott parancsok:

- `npm run lint` - PASS
- `npm run typecheck` - PASS
- `npm run test:run` - PASS
- `npm run smoke:e2e` - PASS, 7/7
- `npm run build` - PASS

Vitest:

- 9 test file
- 74 test
- 74 passed

Playwright:

- 7 smoke test
- 7 passed
- Chromium headless

Build:

- Next.js production build sikeres.
- Uj dashboard salon route-ok es regi `/salon/[id]/*` route-ok buildben latszanak.

## Ami csak dokumentalt / kesobbi e2e kor

Nem automatizalt teljesen ebben a korben:

- Google OAuth bejelentkezes, mert kulso OAuth callback es credentials beallitas fuggo.
- Inactive user teljes bongeszos flow, mert biztonsagos fixture user/status elokeszites kell.
- Provider szalon nelkuli onboarding teljes flow.
- Booking request letrehozas, provider accept/reject es visitor booking status frissules.
- Valodi salon-scoped message thread megnyitasa es kuldes/olvasas.
- Upload valodi fajlfeltoltes smoke.
- Mobil/tablet vizualis regresszio Playwright screenshot baseline-nal.

## Marado kockazatok

- P1: booking accept/reject flow meg nem e2e automatizalt.
- P1: inactive user e2e lefedeshez stabil fixture kell.
- P2: messages `?salon=` route betolt es redirectel, de thread elovalasztas/UX polish meg kezi ellenorzest igenyel.
- P2: fixture strategia jelenleg read-only lookup, nem izolalt teszt DB seed.

## Kovetkezo javasolt lepes

Phase 3B-ben erdemes izolalt dev/test DB fixture seedet kesziteni, majd boviteni a Playwright suite-ot:

- provider szalon nelkul onboarding
- booking create -> provider accept/reject -> visitor status
- messages salon thread select/send/read
- upload smoke valid/invalid file-lal
- inactive user route/action block
- mobil viewport smoke

Javasolt kovetkezo prompt:

```text
GlowySpot Phase 3B - Isolated E2E Fixtures & Critical MVP Flow Automation

Keszits izolalt lokalis/dev test fixture strategiat Playwright smoke-hoz production erintes nelkul. Ne modosits Prisma schema-t es ne futtass production migrationt. Hozz letre kontrollalt fixture seedet visitor/provider/admin/inactive userhez, legalabb egy salonhoz, service-hez, pending bookinghoz es salon message threadhez. Bovitsd a Playwright smoke suite-ot booking create/accept/reject, messages thread, provider-without-salon onboarding, upload smoke es inactive-user guard flow-kal. A vegen futtasd: lint, typecheck, test:run, build, smoke:e2e.
```
