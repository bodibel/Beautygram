# Szalon publikálási állapot — design

Dátum: 2026-08-15
Státusz: jóváhagyott terv, megvalósításra vár
Csomag: **A + B** (alapok és publikálási állapot). A kvóta/admin konfiguráció (**C**) és a Stripe fizetés (**D**) külön specet kap.

---

## 1. Kiindulás és cél

A GlowySpot szolgáltatói több szalont birtokolhatnak — ez már ma is így van az adatokban (két szolgáltatónak 6, illetve 5 szalonja van), és a kódban nincs is korlátozás rá.

A termék háromfázisú bevezetést tervez:

| Fázis | Szabály |
| --- | --- |
| 1 (jelenlegi, felfutás) | Minden szalon ingyenesen publikálható. Nincs fizetési funkció. |
| 2 | Az első szalon ingyenes, a további szalonok **publikálása** fizetős. |
| 3 | Az első szalon X napig ingyenes, utána az is fizetős. |

A fázisok között adminisztrátori beállítással kell tudni váltani, kódmódosítás nélkül.

Fontos megkötés: **a szalon létrehozása mindig ingyenes marad, a publikálása lesz fizetős.**

Ez a spec az 1. fázist teszi logikailag helyessé, és úgy készíti elő a modellt, hogy a 2. fázis bekapcsolása ne igényeljen éles adatokon végzett migrációt.

---

## 2. A jelenlegi állapot problémái

### 2.1 Az `isActive` három független dolgot jelöl

A `Salon.isActive` mezőt ma három, egymástól független folyamat írja:

1. `expireFreeSalons()` — az előfizetés lejáratakor,
2. adminisztrátori felhasználó-tiltás kaszkádja,
3. a felhasználó saját fiókinaktiválásának kaszkádja.

Mivel mindhárom ugyanazt a két mezőt (`isActive`, `inactivatedAt`) állítja, a rendszer nem tudja megmondani, *miért* inaktív egy szalon.

### 2.2 Ebből fakadó bevételi rés

A fiók-visszaállítás minden szalont újraaktivál, aminek van `inactivatedAt` értéke, az előfizetés státuszától függetlenül:

```ts
// lib/auth-options.ts:125 — a signIn callback automatikus visszaállítása
where: { ownerId: dbUser.id, inactivatedAt: { not: null } },
data: { isActive: true, inactivatedAt: null }
```

Az `expireFreeSalons()` pontosan ezt a két mezőt állítja lejáratkor. Ebből a következő út adódik:

1. A szolgáltató FREE időszaka lejár, a szalonjai inaktívvá válnak.
2. A szolgáltató inaktiválja a saját fiókját.
3. 30 napon belül visszalép.
4. Minden lejárt szalonja újra aktív lesz, miközben a `Subscription.status` `INACTIVE` marad.

Ugyanez az út nyitva áll az adminisztrátori feloldásnál (`toggleUserActiveAdmin`) és a kézi `restoreAccount()` hívásnál is.

A jelenlegi ingyenes fázisban ez nem okoz kárt, de a 2. fázisban ez a fizetőfal megkerülése lenne.

### 2.3 Hiányzó előfizetési rekordok és fail-open korlátok

14 szalonból 11-nek nincs `Subscription` rekordja. A korlátozó függvények hiányzó rekord esetén megengedők:

```ts
// lib/subscription.ts — canCreatePost()
if (!sub) {
    return { allowed: true } // backward compat
}
```

Ezek a szalonok tehát korlátlan posztszámmal rendelkeznek, és a lejáratási cron sem találja meg őket.

### 2.4 Nincs publikálási állapot

A „létrehozás ingyenes, publikálás fizetős" szétválasztáshoz szükség van egy explicit publikálási aktusra és állapotra. Ma egy szalon a létrehozás pillanatában azonnal publikus, és a tulajdonos nem tudja önként levenni.

### 2.5 A láthatóság hat helyen van kódolva

A publikus lekérdezések egyenként tartalmazzák a `where: { isActive: true }` feltételt (`getAllSalons`, `getFeaturedSalons`, `getRecentSalons`, `getPublicSalonData`, a poszt-lekérdezés és a foglalás-létrehozás guardja). Egy második láthatósági feltétel bevezetése mindegyiket érinti, és egy kihagyott ág csendes adatszivárgás lenne.

---

## 3. Termékdöntések

Ez a spec az alábbi, jóváhagyott döntésekre épül:

| Kérdés | Döntés |
| --- | --- |
| Fázisváltás módja | Adminisztrátori beállítás, kódmódosítás nélkül |
| Átmenet a 2. fázisba | Türelmi idő értesítéssel, utána a limit feletti szalonok publikálatlanná válnak. A szolgáltató választja ki, melyik marad az ingyenes helyen. *(A türelmi idő megvalósítása a C csomag feladata.)* |
| „Nem publikált" jelentése | Teljesen rejtett: nem jelenik meg keresésben, listákban, térképen; a publikus URL „nem elérhető" választ ad; nincs új foglalás és üzenet. A meglévő foglalások, üzenetek, értékelések és a tartalom megmarad, a tulajdonos szerkesztheti. |
| Adatmodell | Külön, egymásra merőleges jelzők + egyetlen közös láthatósági szűrő |
| Hiányzó előfizetések | Pótolni kell, de a korlátok érvényesítése a `billingEnabled` kapcsolóhoz kötött, így az 1. fázisban minden korlátlan marad |

---

## 4. Adatmodell

### 4.1 `Salon` mezők

```prisma
model Salon {
  // ...

  // Jelentés SZŰKÍTVE: kizárólag fiókszintű állapot.
  // Írója: a fiókműveletek (admin tiltás, felhasználói inaktiválás és ezek visszaállítása).
  isActive             Boolean   @default(true)
  inactivatedAt        DateTime?

  // ÚJ — a tulajdonos publikálási szándéka.
  // Írója: kizárólag a tulajdonos (publishSalon / unpublishSalon, createSalon).
  isPublished          Boolean   @default(false)
  publishedAt          DateTime?

  // ÚJ — rendszer általi publikálási tiltás.
  // Írója: kizárólag a rendszer (előfizetés lejárat, adminisztrátori intézkedés).
  publishBlockedReason String?    // null | "BILLING" | "ADMIN"
  publishBlockedAt     DateTime?
}
```

A modell lényege, hogy **minden mezőnek pontosan egy írója van**. Ez szünteti meg a 2.1 pontban leírt összemosást: a fiók-visszaállítás fizikailag nem tudja feloldani az előfizetési tiltást, mert más mezőt kezel.

A `publishBlockedReason` szándékosan szabad szöveges mező és nem enum: a lehetséges okok bővülni fognak (`BILLING`, `ADMIN`, később esetleg `MODERATION`), és egy szalon egyszerre több okból is tiltható lenne — enum esetén ez ugyanaz az összemosás lenne, amit most számolunk fel. Egyelőre egy ok tárolódik; ha a jövőben többre lesz szükség, a mező külön táblává bontható a `Salon` séma törése nélkül.

### 4.2 `SubscriptionConfig` mező

```prisma
model SubscriptionConfig {
  // ...
  // Fő kapcsoló: amíg false, sem a lejáratás, sem a csomagkorlátok nem érvényesülnek.
  billingEnabled Boolean @default(false)
}
```

Ez a minimum, ami az 1. fázis helyességéhez kell. A teljes kvóta-házirend (ingyenes szalonhelyek száma, lejáratok, türelmi idő) és a hozzá tartozó admin felület a C csomag feladata.

### 4.3 Migráció és backfill

A migráció két lépésből áll:

1. **Oszlopok hozzáadása** a fenti mezőkkel.
2. **Backfill:**
   - Minden meglévő szalon: `isPublished = true`, `publishedAt = createdAt`, `publishBlockedReason = NULL`.
   - Minden `Subscription` nélküli szalon kap egy `FREE` / `ACTIVE` rekordot `freeExpiresAt = NULL` értékkel (soha nem jár le).
   - `SubscriptionConfig` singleton létrehozása `billingEnabled = false` értékkel, ha még nem létezik.

A backfill egyértelmű, mert a jelenlegi adatokban **nincs egyetlen inaktív szalon sem** — nincs kibogozandó eset arról, hogy egy inaktív szalon előfizetés vagy fiók miatt lett-e az.

---

## 5. Komponensek

### 5.1 `lib/salon-visibility.ts` (új)

Egyetlen hely, ahol a publikus láthatóság definiálva van.

```ts
/** Prisma where-töredék publikus szalon-lekérdezésekhez. */
export const PUBLIC_SALON_WHERE = {
  isActive: true,
  isPublished: true,
  publishBlockedReason: null,
} satisfies Prisma.SalonWhereInput

/** Egyetlen, már betöltött szalon publikus láthatósága. */
export function isSalonPubliclyVisible(salon: {
  isActive: boolean
  isPublished: boolean
  publishBlockedReason: string | null
}): boolean
```

**Mit csinál:** egyetlen igazságforrás arra, hogy mit lát egy kijelentkezett látogató.
**Hogyan használandó:** minden publikus lekérdezés a `PUBLIC_SALON_WHERE`-t terjeszti ki; az egy rekordot betöltő ágak (`getPublicSalonData`, foglalás- és üzenet-guard) az `isSalonPubliclyVisible()`-t hívják.
**Mitől függ:** kizárólag a Prisma típusoktól. Nincs adatbázis-hívása, így triviálisan tesztelhető.

Érintett hívási helyek: `getAllSalons`, `getFeaturedSalons`, `getRecentSalons`, `getPublicSalonData`, `getRecentPosts` szalon-szűrése, `createBooking` guardja, `sendMessage` szalon-kontextusú ága.

### 5.2 `lib/salon-publishing.ts` (új)

A publikálási házirend, a fázisváltás varrata.

```ts
/** Publikálhat-e a szolgáltató (további) szalont? */
export async function canPublishSalon(ownerId: string, salonId?: string): Promise<{
  allowed: boolean
  reason?: string
}>
```

**Mit csinál:** eldönti, hogy egy szalon publikálható-e. Az 1. fázisban (`billingEnabled = false`) mindig engedélyez. A 2. fázisban itt fog megjelenni a szalonhely-kvóta, a hívási helyek változtatása nélkül.
**Hogyan használandó:** a `createSalon` és a `publishSalon` hívja publikálás előtt.
**Mitől függ:** `SubscriptionConfig` és a szolgáltató szalonjainak száma.

### 5.3 Kibővített szerver action-ök (`lib/actions/salon.ts`)

```ts
export async function publishSalon(salonId: string)
export async function unpublishSalon(salonId: string)
```

Mindkettő `requireSalonOwner()` guarddal fut, naplóz, és a publikálás a `canPublishSalon()` házirendet kérdezi meg. Az `unpublishSalon` nem törli a `publishedAt` értéket — az az első publikálás időpontja marad, mert a türelmi idő és a statisztikák később támaszkodhatnak rá.

A `createSalon` a `canPublishSalon()` eredménye alapján állítja be a publikálási állapotot. Az 1. fázisban ez azt jelenti, hogy az új szalon azonnal publikált lesz — a mostani viselkedés változatlan —, de a döntés már a házirenden keresztül történik.

### 5.4 `expireFreeSalons()` átírása (`lib/subscription.ts`)

Két változás:

1. `billingEnabled = false` esetén azonnal `0`-val tér vissza, semmit nem módosít.
2. A szalonra `isActive = false` helyett `publishBlockedReason = "BILLING"`, `publishBlockedAt = now` értéket ír. A `Subscription.status = INACTIVE` beállítás változatlan marad.

### 5.5 Csomagkorlátok fail-open megszüntetése

A ténylegesen használt korlátozó függvények — `canCreatePost` és `canUploadVideo` — a `billingEnabled` kapcsolót veszik figyelembe:

- `billingEnabled = false` → korlátlan (1. fázis viselkedése).
- `billingEnabled = true` és hiányzó `Subscription` rekord → **elutasítás** a mostani `allowed: true` helyett. A backfill után nem lehet rekord nélküli szalon, tehát ez már csak védőháló.

A `getSalonSubscription`, a `canUseBooking` és az `isPremium` jelenleg sehonnan nincs meghívva. Ezeket a spec nem módosítja; a `canUseBooking` és az `isPremium` törlésre javasolt, a `getSalonSubscription` viszont hasznos belső segédfüggvény marad. A takarítás nem feltétele ennek a csomagnak.

### 5.6 Fiók-kaszkád szűkítése (`lib/actions/user.ts`, `lib/auth-options.ts`)

A fiókműveletek továbbra is állítják a szalonok `isActive` / `inactivatedAt` mezőit — ez helyes viselkedés, egy tiltott tulajdonos szalonjai ne legyenek láthatók. A változás, hogy **soha nem nyúlnak a publikálási mezőkhöz**.

Ebből két helyes viselkedés következik magától:

- Az előfizetés miatt tiltott szalon nem éled újra a fiók visszaállításakor (a 2.2 rés megszűnik).
- A tulajdonos által önként levett szalon nem publikálódik újra a fiók visszaállításakor.

### 5.7 Felhasználói felület

| Hely | Változás |
| --- | --- |
| `/dashboard/salons` | Minden szalon mellett publikálási státuszjelzés (publikált / nem publikált / tiltva, okkal). Ez teszi a többszalonos működést átláthatóvá. |
| Szalonkezelő (`/dashboard/salons/[salonId]`) | Publikálási kapcsoló. Levételkor megerősítő kérdés, mert a szalon eltűnik a látogatók elől. |
| Tiltott állapot | A kapcsoló letiltva, mellette a tiltás oka és a teendő. |

### 5.8 Naplózás

Új események az `AUDIT_ACTIONS` konstansban: `SALON_PUBLISH`, `SALON_UNPUBLISH`, `SALON_PUBLISH_BLOCKED` (elutasított publikálási kísérlet), `SALON_BILLING_BLOCKED` (a cron általi tiltás).

---

## 6. Adatfolyam

**Publikálás:**
`publishSalon(salonId)` → `requireSalonOwner` → `canPublishSalon(ownerId, salonId)` → engedélyezve: `isPublished = true`, `publishedAt` beállítása (ha még üres), napló → a szalon megjelenik minden publikus lekérdezésben, mert a `PUBLIC_SALON_WHERE` mindhárom feltétele teljesül.

**Előfizetés lejárata (2. fázistól):**
cron → `expireFreeSalons()` → `billingEnabled` ellenőrzés → `Subscription.status = INACTIVE`, `publishBlockedReason = "BILLING"` → a szalon eltűnik a publikus lekérdezésekből, miközben `isPublished` és `isActive` érintetlen marad.

**Fiók visszaállítása:**
bejelentkezés → `isActive = true`, `inactivatedAt = null` a szalonokon → a szalon **csak akkor** válik újra láthatóvá, ha `isPublished = true` és nincs publikálási tiltás. Egy előfizetés miatt tiltott szalon rejtve marad.

---

## 7. Hibakezelés

- **Fail-closed láthatóság.** Minden publikus ág a közös szűrőt használja; ha bármelyik feltétel nem teljesül, a szalon rejtett. Kétes esetben a rejtés a helyes kimenet.
- **Nem publikált szalon publikus URL-je** a „nem található" ágra fut, nem 500-ra, és nem árulja el, hogy a szalon létezik.
- **Blokkolt publikálási kísérlet** beszédes hibaüzenetet ad (mi az ok, mi a teendő), nem néma sikertelenséget.
- **Foglalás és üzenet** nem publikált szalonra elutasításra kerül a szerver oldalon is, nem csak a felületen elrejtve.

---

## 8. Tesztelés

Vitest, a meglévő `tests/` mintát követve (mockolt Prisma, valódi házirend-logika).

**Regressziós teszt, ami a mostani hibát fogja — ez a legfontosabb:**
előfizetés miatt tiltott szalon **nem** válik újra láthatóvá a tulajdonos fiókjának visszaállításakor, sem a `signIn` automatikus visszaállításán, sem a `restoreAccount`-on, sem az adminisztrátori feloldáson keresztül.

További esetek:

| Terület | Eset |
| --- | --- |
| Láthatósági szűrő | Mindhárom feltétel kombinációi; csak a `true / true / null` hármas látható |
| Publikálási műveletek | Idegen szalon publikálása/levétele elutasításra kerül |
| Önkéntes levétel | Fiók-visszaállítás nem publikálja újra |
| `billingEnabled = false` | `expireFreeSalons()` nem módosít semmit; a csomagkorlátok engedékenyek |
| `billingEnabled = true` | Hiányzó `Subscription` rekord esetén a korlátok elutasítanak (fail-closed) |
| `canPublishSalon` | 1. fázisban tetszőleges számú szalonra engedélyez |
| Publikus lekérdezések | Nem publikált szalon egyik publikus ágon sem jelenik meg |

---

## 9. Hatókörön kívül

Ez a spec **nem** tartalmazza:

- Stripe-integrációt és bármilyen fizetési folyamatot (**D** csomag).
- A kvóta-házirend tényleges paraméterezését: ingyenes szalonhelyek száma, lejáratok, türelmi idő hossza (**C** csomag).
- Türelmi idős értesítő emaileket és a hozzájuk tartozó cron feladatot (**C** csomag).
- A `SubscriptionConfig` admin szerkesztőfelületét (**C** csomag). Ebben a csomagban csak a `billingEnabled` mező jön létre, alapértelmezett `false` értékkel; váltani egyelőre adatbázisból lehet.
- A szolgáltatói választást arról, melyik szalon foglalja el az ingyenes helyet (**C** csomag).

---

## 10. Következő lépés

Megvalósítási terv készítése a `writing-plans` skillel.
