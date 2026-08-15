# GlowySpot Phase 3B - Critical MVP Flow E2E Report

Datum: 2026-06-05

## Cel

Phase 3B celja a Phase 3A route smoke utan a kritikus MVP flow-k bongeszos ellenorzese volt:

- booking request create
- provider accept
- visitor booking status refresh
- salon-context message send/reply/read
- upload alap e2e elokeszites

Nem tortent Prisma schema modositas, migration, production migration vagy VPS muvelet.

## Modositott / letrehozott fajlok

- `package.json`
- `tests/e2e/setup/seed-mvp.ts`
- `tests/e2e/utils/auth.ts`
- `tests/e2e/utils/mvp-fixtures.ts`
- `tests/e2e/glowyspot-mvp-flows.e2e.ts`
- `tests/e2e/assets/e2e-beauty-upload.png`
- `components/salon-page/salon-services.tsx`
- `components/salon-page/booking-request-modal.tsx`
- `components/dashboard/booking-requests.tsx`
- `app/dashboard/bookings/page.tsx`
- `app/dashboard/messages/page.tsx`
- `components/salon-page/salon-hero.tsx`
- `components/salon/message-modal.tsx`
- `components/salon/cards/PostsCard.tsx`
- `components/salon/modals/PostModal.tsx`
- `GLOWYSPOT_PHASE_3A_PLAYWRIGHT_SMOKE_REPORT.md`

## Fixture / seed megoldas

Uj script:

- `npm run e2e:seed`
- `npm run e2e:mvp`

Seed fajl:

- `tests/e2e/setup/seed-mvp.ts`

Strategia:

- Csak `E2E_DATABASE_URL` vagy `DATABASE_URL` alapjan fut.
- Alapbol csak lokalis DB host engedelyezett: `localhost`, `127.0.0.1`, `::1`.
- Nem lokalis disposable dev DB csak explicit `E2E_ALLOW_NONLOCAL_DB=true` mellett engedelyezett.
- Idempotens: a seed elobb csak sajat E2E fixture adatokat takarit.
- Nem torol nem teszt adatot.

Fixture userek:

- `e2e.visitor@glowyspot.test`
- `e2e.provider@glowyspot.test`
- `e2e.other-provider@glowyspot.test`
- `e2e.admin@glowyspot.test`

Fixture entitasok:

- provider-owned salon: `e2e-mvp-studio`
- other-provider salon: `e2e-other-studio`
- active Standard subscription a booking engedelyezesehez
- active service: `E2E MVP Arckezelés`
- initial salon-context message

Runtime cleanup:

- `tests/e2e/utils/mvp-fixtures.ts` afterAll cleanup torli a teszt bookingokat, message-eket es `E2E:%` postokat az E2E userek/szalonok koreben.

## Booking E2E eredmeny

Fajl:

- `tests/e2e/glowyspot-mvp-flows.e2e.ts`

Automatizalt flow:

1. visitor credentials login
2. public salon profile: `/profile/e2e-mvp-studio`
3. service booking CTA click
4. booking modal kitoltes:
   - service
   - jovo heti datum
   - `10:30`
5. request letrehozas
6. visitor `/dashboard/bookings` pending status ellenorzes
7. provider login
8. `/dashboard/salons/[salonId]/bookings`
9. pending booking latszik
10. provider accept
11. provider oldalon accepted status ellenorzes
12. visitor ujra login
13. visitor `/dashboard/bookings` accepted status ellenorzes

Eredmeny:

- PASS

## Messages E2E eredmeny

Automatizalt flow:

1. visitor login
2. public salon profile megnyitas
3. public message modal megnyitas
4. visitor uzenet kuldese salon contexttel
5. provider login
6. `/dashboard/salons/[salonId]/messages`
7. redirect ellenorzes:
   - `/dashboard/messages?salon=[salonId]`
8. visitor uzenet latszik salon-szurt threadben
9. provider reply kuldese
10. visitor login
11. `/dashboard/messages?salon=[salonId]`
12. provider reply latszik

Eredmeny:

- PASS

## Upload E2E eredmeny

Elokeszitve:

- `tests/e2e/assets/e2e-beauty-upload.png`
- opcionális Playwright test:
  - provider login
  - `/dashboard/salons/[salonId]/portfolio`
  - new post modal
  - image file attach
  - post publish

Alapertelmezetten:

- SKIPPED

Indok:

- Az upload API fail-closed kulso AI moderation + beauty relevance ellenorzest futtat.
- Ez lokalis smoke-ban nem determinisztikus es kulso API availability/cost fuggo.
- Nem kerult megkerules vagy test-only bypass az appba.

Futtatas, ha explicit kell:

```bash
E2E_ENABLE_UPLOAD_FLOW=true npm run e2e:mvp
```

Megjegyzes Windows PowerShellhez:

```powershell
$env:E2E_ENABLE_UPLOAD_FLOW="true"; npm run e2e:mvp
```

## Javított hibak

### Public salon message CTA

Erintett fajl:

- `components/salon-page/salon-hero.tsx`

Problema:

- Bookingot fogado szalonnal az `Üzenet küldése` CTA csak akkor jelent meg, ha `allowBookings` hamis volt.

Kockazat:

- MVP messages flow booking-enabled szalonon nem volt elerheto a publikus profilrol.

Javitas:

- `allowBookings` mellett is megjelenik egy secondary message CTA, ha `salon.allowMessages` aktiv.

Prioritas:

- P1

MVP blocker:

- Igen, a messages MVP flow miatt.

### Tailwind markdown scan issue

Erintett fajl:

- `GLOWYSPOT_PHASE_3A_PLAYWRIGHT_SMOKE_REPORT.md`

Problema:

- A riportban szereplo literal Tailwind arbitrary background-url classot a Tailwind v4 content scanner classkent ertekelte, es webpack CSS buildben `Cannot find module './...&...'` hibat okozott.

Javitas:

- A dokumentacios peldat atfogalmaztam, hogy ne legyen ervenyes Tailwind class token.

Prioritas:

- P1

MVP blocker:

- Igen, mert dev szerver 500-at okozott.

### Stabil E2E selectorok

Erintett fajlok:

- `components/salon-page/salon-services.tsx`
- `components/salon-page/booking-request-modal.tsx`
- `components/dashboard/booking-requests.tsx`
- `app/dashboard/bookings/page.tsx`
- `app/dashboard/messages/page.tsx`
- `components/salon/message-modal.tsx`
- `components/salon/cards/PostsCard.tsx`
- `components/salon/modals/PostModal.tsx`

Javitas:

- Minimalis `data-testid` attribútumok kritikus E2E interakciokhoz.
- Nem valtozott adatmodell vagy feature logika.

## Teszteredmenyek

Lefuttatva:

- `npm run lint` - PASS
- `npm run typecheck` - PASS
- `npm run test:run` - PASS
- `npm run e2e:mvp` - PASS
  - 2 passed
  - 1 skipped upload opt-in
- `npm run smoke:e2e` - PASS
  - 9 passed
  - 1 skipped upload opt-in
- `npm run build` - PASS

Vitest:

- 9 test file
- 74 tests
- 74 passed

Playwright:

- route smoke + MVP flow suite passed
- upload opt-in skipped default futtatasban

## Marado MVP release blockerek / kockazatok

- P1: upload teljes e2e csak kulso AI moderation mellett futtathato; manual smoke vagy dedikalt mocked moderation strategy kell.
- P1: booking reject flow meg nincs kulon automatizalva, csak accept.
- P2: message read/unread allapot finom ellenorzese meg nem teljes.
- P2: provider-without-salon onboarding flow nincs Phase 3B-ben automatizalva.
- P2: mobil/tablet visual e2e nincs screenshot baseline-nal lefedve.

## Kovetkezo javasolt prompt

```text
GlowySpot Phase 3C - Final MVP Smoke Hardening

Folytasd a Playwright MVP coverage boviteset Prisma schema/migration es VPS erintes nelkul. Add hozza a booking reject flow-t, provider-without-salon onboarding smoke-ot, inactive user e2e guard tesztet, es mobil viewport smoke-ot. Uploadhoz keszits dontest: vagy manual checklist marad, vagy vezess be biztonsagos test-only mocked moderationt production kod bypass nelkul. A vegen futtasd: lint, typecheck, test:run, smoke:e2e, e2e:mvp, build.
```
