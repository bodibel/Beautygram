# GlowySpot teljes audit és javítási riport

Dátum: 2026-08-15
Kiindulási commit: `35922ec` (chore: bump version to 1.3.0)
Környezet: lokális fejlesztői (Next.js 16.2.6, PostgreSQL a `glowyspot-db` konténerben, port 5410)

Hatókör: kód- és hiányosságellenőrzés, biztonság, be- és kijelentkezés, frontend logika és gombláthatóság, szerepkörök és a hozzájuk tartozó funkciók, kiemelten a logolás, valamint a lokális és a Git-verzió közötti eltérés. Az éles környezet nem volt elérhető, így minden ellenőrzés lokálisan és a Git-előzményen történt.

---

## 1. Összefoglaló

| Súlyosság | Talált | Javítva |
| --- | ---: | ---: |
| Kritikus | 2 | 2 |
| Magas | 3 | 3 |
| Közepes | 6 | 6 |
| Alacsony / dokumentáció | 5 | 5 |

A javítás utáni állapot: `npm run typecheck` hibamentes, `npm run lint` figyelmeztetés nélkül, `npm run test:run` 84/84 zöld.

---

## 2. Kritikus hibák

### 2.1 A cron végpontok hitelesítés nélkül hívhatók voltak (fail-open)

**Fájlok:** `app/api/cron/expire-free-salons/route.ts`, `app/api/cron/subscription-reminders/route.ts`

Az ellenőrzés `if (cronSecret && authHeader !== ...)` formában készült, ami azt jelentette, hogy **hiányzó `CRON_SECRET` esetén az egész ellenőrzés kimaradt**. A `CRON_SECRET` sem a `.env`-ben, sem a `.env.production.example`-ben nem szerepelt, tehát alapértelmezés szerint egyik környezet sem volt védve.

Élő bizonyíték a javítás előtt:

```
GET /api/cron/expire-free-salons  ->  HTTP 200
{"success":true,"inactivated":0,"timestamp":"2026-08-15T06:28:11.168Z"}
```

**Hatás:** bárki tömegesen inaktiválhatta a lejárt FREE szalonokat, illetve a `subscription-reminders` végponton keresztül tömeges email-kiküldést indíthatott (Resend-költség és domain-reputáció).

**Javítás:** mindkét végpont fail-closed lett — hiányzó titok esetén is 401. A `CRON_SECRET` bekerült a lokális `.env`-be és dokumentálva lett a `.env.production.example`-ben.

Ellenőrzés a javítás után:

| Hívás | Eredmény |
| --- | --- |
| Authorization header nélkül | HTTP 401 |
| Hibás secret | HTTP 401 |
| Helyes secret | HTTP 200 |

### 2.2 Az adminisztrátori tiltás bejelentkezéssel megkerülhető volt

**Fájlok:** `lib/auth-options.ts`, `lib/actions/user.ts`

A `signIn` callback minden inaktív fiókot automatikusan újraaktivált, ha az inaktiválás 30 napon belül történt. Az admin tiltás (`toggleUserActiveAdmin`) ugyanazt a két mezőt állította (`isActive: false`, `inactivatedAt: now`), mint a felhasználó saját fiókinaktiválása, így a kód nem tudott különbséget tenni a két eset között. Emellett az `authorize()` egyáltalán nem vizsgálta az `isActive` mezőt.

Élő bizonyíték a javítás előtt: a letiltott fiók sikeresen bejelentkezett, session tokent kapott, és az `isActive` visszaállt `true`-ra.

**Javítás:**

- Új `User.deactivatedBy` mező (`"self"` vagy `"admin"`), migráció: `20260815064741_add_user_deactivated_by`.
- Az automatikus visszaállítás csak `deactivatedBy !== "admin"` esetén fut le.
- Az `authorize()` és a `signIn` callback is elutasítja az admin által letiltott fiókot.
- Minden érintett útvonal naplóbejegyzést ír.

Ellenőrzés a javítás után:

| Lépés | Eredmény |
| --- | --- |
| Letiltott fiók bejelentkezése | HTTP 401 |
| Kapott session token | nincs |
| Fiók állapota utána | `isActive=false`, `deactivatedBy=admin` (változatlan) |
| Naplóbejegyzés | `LOGIN_FAILED`, `reason: admin_disabled` |

---

## 3. Magas súlyosságú hibák

### 3.1 Nem volt eseménynaplózás

A kiindulási állapotban **egyetlen biztonsági esemény sem volt naplózva**: nem volt audit-log adatmodell a sémában, nem volt logger modul, és a NextAuth `events` blokk is hiányzott. A kódban 88 `console.error` és 4 `console.log` szerepelt, utóbbiak közül három cron/fejlesztői célú.

Ez azt jelentette, hogy a bejelentkezés, sikertelen bejelentkezés, kijelentkezés, jelszó-visszaállítás, szerepkörváltás, fiók tiltása vagy törlése — tehát minden vitatható vagy támadásra utaló művelet — nyomtalan maradt. Brute-force kísérlet sem volt detektálható.

**Fontos felfedezés:** az adatbázisban már létezett egy jól megtervezett `AuditLog` tábla 71 sorral és három indexszel, valamint a `codex/release-prep-2026-04-25` ágon egy teljes implementáció (`lib/audit-log.ts`, admin nézet). Ez a main ágról hiányzott — a séma és a kód elvesztette, az adat megmaradt.

**Javítás:** az implementáció portolva és kibővítve. Részletek a 6. fejezetben.

### 3.2 Séma- és migrációs eltérés az adatbázistól

A `prisma/schema.prisma` nem tartalmazta az adatbázisban meglévő `AuditLog` és `CommentLike` táblákat, a migrációs előzmény pedig eltért:

- A `prisma/migrations/` három olyan migrációt tartalmazott, amely az adatbázisban nem szerepelt.
- Az adatbázisban két olyan migráció volt alkalmazva, amely lokálisan hiányzott.

Emiatt a `prisma migrate status` előzmény-eltérést jelzett, és bármilyen új migráció adatbázis-reset kockázatával járt.

**Javítás:** a baseline előtti migrációk a `prisma/migrations_legacy_pre_baseline/` mappába kerültek, a `prisma/migrations/` pedig az adatbázisban ténylegesen alkalmazott előzményt tükrözi. A hiányzó modellek visszakerültek a sémába.

Ellenőrzés: `npx prisma migrate status` → *"Database schema is up to date!"*

### 3.3 Mass-assignment az `updateSalon()`-ban

**Fájl:** `lib/actions/salon.ts`

Az `updateSalon()` a teljes `Prisma.SalonUncheckedUpdateInput` típust fogadta, és a bejövő objektumot szűrés nélkül továbbadta a `prisma.salon.update()`-nek. A hívók `Partial<Salon>`-t adnak át kliensoldali űrlapokból, tehát a szalon tulajdonosa tetszőleges oszlopot írhatott:

| Mező | Visszaélés |
| --- | --- |
| `ownerId` | A szalon átírása másik felhasználóra |
| `isActive` / `inactivatedAt` | A FREE időszak lejáratának megkerülése |
| `rating` / `reviewCount` | Értékelés hamisítása |
| `slug` | Másik szalon URL-jének elvétele |
| `salonFingerprint` | A duplikációellenőrzés megkerülése |

A `requireSalonOwner()` guard csak azt biztosította, hogy a hívó a saját szalonját szerkessze — azt nem, hogy *mit* szerkeszthet.

Ez a javítás a `codex/release-prep-2026-04-25` ágon már elkészült (T-003), de a `main` ágra soha nem került át.

**Javítás:** explicit allowlist (`PROVIDER_EDITABLE_SALON_FIELDS`, 39 mező); minden más kulcs eldobásra kerül. Az összes jelenlegi hívó (szalonbeállítások, kapcsolat, galéria, csapat) csak engedélyezett mezőket küld, tehát a szűrés nem érint működő funkciót.

Regressziós teszt: `tests/auth/salon-mass-assignment.test.ts` — 9 eset, amely ellenőrzi, hogy a jogos mezők átmennek, a hét védett mező pedig kivétel nélkül eldobásra kerül.

---

## 4. Közepes súlyosságú hibák

| # | Hiba | Fájl | Javítás |
| --- | --- | --- | --- |
| 4.1 | Az admin oldalakon nem volt saját szerver oldali guard, a védelem kizárólag a `proxy.ts` matcheren múlt | `app/dashboard/admin/` | Új `app/dashboard/admin/layout.tsx` szerepkör-ellenőrzéssel |
| 4.2 | Az admin áttekintő oldal minden KPI-t bedrótozott `0`-ként jelenített meg | `app/dashboard/admin/overview/page.tsx` | Valódi adatok az adatbázisból, hó/hó változással és sikertelen bejelentkezés-számlálóval |
| 4.3 | A regisztráció nem validált jelszóerősséget és email-formátumot | `lib/actions/auth.ts` | Új `lib/auth/password-policy.ts` (min. 8 karakter, betű és szám), email-formátum ellenőrzés, email normalizálás |
| 4.4 | A jelszó-visszaállítás sem validált jelszóerősséget | `lib/actions/password-reset.ts` | Ugyanaz a házirend érvényesítve |
| 4.5 | Kijelentkezett felhasználó is látta a védett route-ra mutató linkeket a mobil navigációban | `components/navigation/public-bottom-nav.tsx` | A védett menüpontok kijelentkezve bejelentkezési ablakot nyitnak guard-redirect helyett |
| 4.6 | Egy teszt bukott: a szalon-áttekintő nem tartalmazta a `PortfolioVibeWidget`-et | `components/salon-console/salon-overview-content.tsx` | A widget bekötve (befejezetlen refaktor lezárása) |

Ezen felül a Vitest nem oldotta fel a `@/` path aliast, ezért minden nem mockolt belső import elszállt. Új `vitest.config.ts` rendezi.

---

## 5. Ami rendben volt

Az ellenőrzés során az alábbiak megfelelőnek bizonyultak, ezeken nem történt változtatás:

- **Session cookie:** httpOnly, kliensoldali JavaScriptből nem olvasható.
- **Path traversal:** az `app/api/files/[filename]/route.ts` a `safeFilename !== filename` összehasonlítással helyesen zárja ki a `../` mintákat.
- **Szerepkör-alapú navigáció:** a `lib/navigation-config.ts` helyesen szűri a menüpontokat szerepkör szerint; élő teszttel igazolva, hogy látogatóként az admin útvonal `/dashboard?forbidden=true`-ra irányít.
- **Szerver action guardok:** az admin műveletek `requireAdminSession`-t, a szalonműveletek tulajdonosi ellenőrzést használnak, és mindegyik az adatbázisból nézi az `isActive` állapotot.
- **Regisztrációs szerepkör:** publikus regisztrációval csak `visitor` és `provider` választható, admin szerepkör nem szerezhető.
- **Utolsó admin védelme:** a `lib/auth/role-policy.ts` megakadályozza az utolsó admin törlését, inaktiválását és jogosultság-megvonását.
- **`proxy.ts` vs `middleware.ts`:** a Next.js 16 a `middleware` konvenciót `proxy`-ra nevezte át. A `middleware.ts` deprecated, de továbbra is működik, így a Git-en lévő verzió sem volt védtelen.

---

## 6. Eseménynaplózás — a bevezetett megoldás

### Adatmodell

Az `AuditLog` modell visszakerült a sémába, pontosan az adatbázisban meglévő tábla szerkezetével:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String
  entity    String?
  entityId  String?
  metadata  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([action, createdAt])
  @@index([userId, createdAt])
  @@index([entity, entityId, createdAt])
}
```

A `userId` szándékosan `SetNull`: a felhasználó törlése után is megmarad a naplóbejegyzés.

### Helper

`lib/audit-log.ts`:

- `writeAuditLog()` — soha nem dob hibát, így a naplózás nem akaszthatja meg az üzleti műveletet.
- `AUDIT_ACTIONS` — 22 tipizált eseményazonosító, hogy a szűrők és riportok konzisztensek maradjanak.
- `getAuditRequestContext()` route handlerekhez, `getAuditActionContext()` szerver action-ökhöz — mindkettő kinyeri az IP-címet (`x-forwarded-for`, `x-real-ip`) és a user agentet.

### Naplózott események

24 hívási pont, 8 fájlban:

| Terület | Események |
| --- | --- |
| Hitelesítés | `LOGIN`, `LOGIN_FAILED` (okkal: `unknown_user`, `bad_password`, `admin_disabled`), `LOGOUT`, `REGISTER` |
| Jelszó | `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_COMPLETE` |
| Fiókkezelés | `ACCOUNT_SELF_DEACTIVATE`, `ACCOUNT_SELF_RESTORE`, `ACCOUNT_AUTO_RESTORE` |
| Admin | `ADMIN_USER_UPDATE`, `ADMIN_USER_DELETE`, `ADMIN_USER_ROLE_CHANGE`, `ADMIN_USER_DEACTIVATE`, `ADMIN_USER_ACTIVATE`, `ADMIN_CATEGORY_CREATE/UPDATE/DELETE` |
| Szalon | `CREATE_SALON`, `UPDATE_SALON` |
| Tartalom | `SEND_MESSAGE`, `UPLOAD_FILE` |

A felhasználótörlés naplóbejegyzése szándékosan a törlés **előtt** készül, hogy a törölt fiók adatai (email, szerepkör) megmaradjanak.

### Admin nézet

`/dashboard/admin/audit-log` — csak adminisztrátoroknak. Eseményre, felhasználó-azonosítóra és kezdődátumra szűr, megjeleníti a felhasználó nevét és email-címét, az IP-címet és a metaadatot. A sikertelen bejelentkezések és a jogosultsági elutasítások pirossal, az admin műveletek borostyánszínnel emelkednek ki.

Élő ellenőrzés:

```
LOGIN_FAILED | e2e.visitor@glowyspot.test | admin_disabled | ::1 | 06:59:39
LOGIN        | visitor1@glowyspot.com     |                | ::1 | 07:00:02
LOGIN_FAILED | visitor1@glowyspot.com     | bad_password   | ::1 | 07:00:03
```

---

## 7. Lokális és Git-verzió eltérése

A vizsgálat idején a `main` és az `origin/main` commitjai azonosak voltak (`35922ec`, 0 ahead / 0 behind), **de a munkakönyvtár jelentősen eltért**:

- 94 módosított fájl, összesen +4922 / −3680 sor, mind commitolatlan.
- A `middleware.ts` lokálisan törölve, helyette `proxy.ts` — utóbbi **verziókövetés nélkül**, tehát az útvonalszintű guard forrása sehol nem volt elmentve.

Ez azt jelentette, hogy a Git-en lévő verzió egy lényegesen régebbi állapotot tükrözött, és a helyi gép elvesztése esetén a munka nagy része megsemmisült volna.

### Be nem olvasztott munka a `codex/release-prep-2026-04-25` ágon

Az ág egy soha be nem olvasztott biztonsági release-előkészítést tartalmaz (T-001 … T-009, dokumentálva a `docs/glowyspot_audit_log.md`-ben azon az ágon). Ebből a mostani auditig hiányzott a `main`-ről:

| Feladat | Állapot a `main`-en az audit előtt | Most |
| --- | --- | --- |
| T-003 mass-assignment védelem | hiányzott | portolva (3.3 pont) |
| T-005 cron fail-closed | hiányzott | portolva (2.1 pont) |
| Audit-log implementáció | hiányzott | portolva és kibővítve (6. pont) |
| T-008 egy szolgáltató – egy szalon | hiányzik | terméki döntés, lásd 10. pont |
| T-002, T-004, T-006, T-007, T-009 | jelen van | — |

Az ág a jövőben is érdemes átnézésre, mielőtt törölnék.

---

## 7.1 Függőségi sebezhetőségek

Az audit során az `npm audit` 1 kritikus és 14 magas súlyosságú bejegyzést mutatott (a 2026-05-29-i állapot 0 kritikus és 7 magas volt). Kettő közvetlenül ezt az alkalmazást érintette:

| Csomag | Súlyosság | Probléma | Miért számít itt |
| --- | --- | --- | --- |
| `next-auth` 4.24.13 | kritikus | Az email-normalizáló a Unicode-feldolgozás **előtt** validálja a címet | Fiókátvételi kockázat email-alapú bejelentkezésnél |
| `next` 16.2.6 | magas | Middleware / Proxy bypass App Routerben | Pontosan azt a `proxy.ts` réteget kerüli meg, amin az útvonalvédelem áll |

**Javítás:** `next` → 16.3.1, `next-auth` → 4.24.15. Mindkettő nem-major frissítés, a meglévő semver tartományon belül.

Frissítés utáni állapot: **kritikus 0**, magas 11, összesen 13. A `next` és a `next-auth` tiszta.

A `next` proxy-bypass hibája jól illusztrálja, miért fontos a többrétegű védelem: ha csak a `proxy.ts` védte volna az admin szekciót, ez a hiba kinyitotta volna. A mostani javítás során hozzáadott admin layout guard és a meglévő szerver action guardok mögötte is fognak.

Ellenőrzés a frissítés után: typecheck és lint tiszta, 75/75 teszt zöld, build sikeres (a `ƒ Proxy (Middleware)` továbbra is regisztrálva), auth smoke teszt rendben (bejelentkezés 200 session tokennel, hibás jelszó 401, védett útvonal kijelentkezve 307, cron auth nélkül 401).

---

## 8. Dokumentáció

**Kiindulás:** a `README.md` a `create-next-app` alapértelmezett sablonja volt, rossz portszámmal (3000 a valós 3020 helyett), setup, adatbázis-indítás, seed és környezeti változók leírása nélkül. A repó gyökerében 29 darab `GLOWYSPOT_*.md` fájl hevert rendezetlenül.

**Javítás:**

- A `README.md` újraírva: gyors indítás, teszt fiókok, parancstáblázat, környezeti változók, szerepkörök és a háromrétegű jogosultság-ellenőrzés, fiókinaktiválás szemantikája, eseménynaplózás, projektstruktúra és migrációs tudnivalók.
- A 29 gyökérbeli dokumentum tematikus mappákba került: `docs/audits/`, `docs/migrations/`, `docs/phases/`, `docs/plans/`, `docs/product/`.
- Új `docs/README.md` index az összes dokumentum leírásával.
- A `.env.production.example` kiegészítve a hiányzó `CRON_SECRET` és `DB_PORT` változókkal, valamint a fail-closed viselkedés magyarázatával.

---

## 9. Ellenőrzések a javítások után

| Ellenőrzés | Eredmény |
| --- | --- |
| `npm run typecheck` | hibamentes |
| `npm run lint` | figyelmeztetés nélkül |
| `npm run test:run` | 84 / 84 zöld |
| `npx prisma migrate status` | "Database schema is up to date!" |
| Cron auth nélkül / hibás kulccsal / helyes kulccsal | 401 / 401 / 200 |
| Letiltott fiók bejelentkezése | 401, nincs session, tiltás megmarad |
| Sikeres és sikertelen bejelentkezés | 200 / 401, mindkettő naplózva |
| Admin áttekintő KPI-k | valós adatok (17 felhasználó, 10 szolgáltató, 14 szalon, 67 bejegyzés) |
| Látogató hozzáférése az eseménynaplóhoz | 307 → `/dashboard?forbidden=true` |

---

## 10. Nyitott pontok és javaslatok

Az alábbiak nem képezték a mostani javítás részét:

| Terület | Megjegyzés | Javasolt prioritás |
| --- | --- | --- |
| Bejelentkezési rate limit | A sikertelen bejelentkezés már naplózott, de nincs kísérletszám-korlátozás. A napló alapján ez most már megvalósítható. | P1 |
| Maradék függőségi sebezhetőségek | 11 magas és 2 egyéb, mind tranzitív (`prisma`/`@prisma/config`/`effect`, `sharp`→libvips, `vite`, glob-csomagok). A `sharp` javítása major verzióugrás, külön tesztelést igényel. Lásd `GLOWYSPOT_REMAINING_SECURITY_RISK_NOTE.md`. | P1 |
| Upload rate limit | Folyamat-lokális, több példány esetén nem közös. | P2 |
| Eseménynapló megőrzési ideje | Nincs archiválási vagy törlési szabály; a tábla korlátlanul nő. | P2 |
| `CommentLike` funkció | A tábla és a modell létezik, de a kód nem használja. | P3 |
| Egy szolgáltató – egy szalon szabály | **Visszavonva.** A szabály már nem él: egy szolgáltatónak több szalonja is lehet. A `codex` ág T-008 feladatát tehát nem kell portolni. A többszalonos működés logikai rendbetétele és a későbbi fizetős publikálás terve: [`../superpowers/specs/2026-08-15-salon-publishing-state-design.md`](../superpowers/specs/2026-08-15-salon-publishing-state-design.md). | — |
| `Salon.isActive` háromszoros túlterhelése | A mező egyszerre jelöli az előfizetés lejáratát, az adminisztrátori tiltás kaszkádját és a felhasználó saját inaktiválását. Emiatt a fiók-visszaállítás feloldja az előfizetés miatti inaktiválást is. Jelenleg ártalmatlan (minden ingyenes), de a fizetés bevezetése előtt javítani kell. Terv: a fenti spec. | P1 |
| `story-bar.tsx` nem létező mezőt olvas | A `salon.subscriptionPlan` mező nem szerepel a Prisma sémában, így a prémium jelölés soha nem jelenik meg. Holt kód, nem hiba-forrás. | P3 |
| Holt kód a `lib/subscription.ts`-ben | A `canUseBooking` és az `isPremium` sehonnan nincs meghívva. | P3 |
| Archívumfájlok a repóban | Több `.tar.gz` és `.tar` fájl a gyökérben; a `.gitignore` kizárja őket, de a lemezen ott vannak. | P3 |
