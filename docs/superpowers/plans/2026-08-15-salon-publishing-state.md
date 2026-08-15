# Szalon publikálási állapot — megvalósítási terv

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `Salon.isActive` háromszoros túlterhelésének megszüntetése külön publikálási állapot bevezetésével, hogy a többszalonos működés logikailag helyes legyen és a későbbi fizetős publikálás ne igényeljen éles adatmigrációt.

**Architecture:** A `Salon` három, egymásra merőleges jelzőt kap, mindegyiknek pontosan egy írójával: `isActive` (fiókszintű állapot), `isPublished` (a tulajdonos szándéka), `publishBlockedReason` (rendszer általi tiltás). A publikus láthatóság egyetlen közös Prisma where-töredékből származik, a publikálhatóság pedig egy házirend-függvényből, ami az 1. fázisban mindig engedélyez — ez a varrat a 2. fázis bekapcsolásához.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 6 + PostgreSQL, Vitest, Tailwind CSS 4.

**Spec:** [`docs/superpowers/specs/2026-08-15-salon-publishing-state-design.md`](../specs/2026-08-15-salon-publishing-state-design.md)

## Global Constraints

- Minden felhasználónak szóló szöveg magyar nyelvű.
- A kód a meglévő stílust követi: 4 szóköz behúzás a `lib/` és `app/` alatt, 2 szóköz a `components/` alatt (a szomszédos fájlokhoz igazodva).
- Minden szerver action a meglévő guard-mintát használja: `requireSession()`, `requireSalonOwner()`, `requireAdminSession()` a `lib/auth-utils.ts`-ből, illetve a `lib/actions/salon.ts` helyi guardjaiból.
- Minden állapotváltoztató művelet naplózandó a `writeAuditLog()` hívással a `lib/audit-log.ts`-ből, és minden új eseményazonosítót fel kell venni az `AUDIT_ACTIONS` konstansba.
- A tesztek Vitest-tel futnak, a `tests/` meglévő mintáját követve: `vi.hoisted()` mockok, mockolt Prisma kliens, valódi házirend-logika.
- Tilos `npm run dev`-et indítani a tesztfuttatáshoz; a build- és tesztparancsok: `npm run typecheck`, `npm run lint`, `npm run test:run`.
- Prisma migráció készítése előtt a dev szervert le kell állítani, különben Windows alatt a `prisma generate` `EPERM` hibával elszáll a lefoglalt `query_engine-windows.dll.node` miatt.
- A `billingEnabled` alapértéke `false` marad a terv végén; ez az 1. fázis.

---

### Task 1: Séma bővítés, migráció és backfill

**Files:**
- Modify: `prisma/schema.prisma` (`Salon` és `SubscriptionConfig` modellek)
- Create: `prisma/migrations/<timestamp>_add_salon_publishing_state/migration.sql` (a `prisma migrate dev` generálja, majd kézzel kiegészítjük)

**Interfaces:**
- Consumes: semmit (ez az első task).
- Produces: `Salon.isPublished: boolean`, `Salon.publishedAt: Date | null`, `Salon.publishBlockedReason: string | null`, `Salon.publishBlockedAt: Date | null`, `SubscriptionConfig.billingEnabled: boolean`. Minden későbbi task ezekre a mezőnevekre épül.

- [ ] **Step 1: A dev szerver leállítása**

Ha fut a fejlesztői szerver, állítsd le. Windows alatt a futó szerver lefoglalja a Prisma query engine DLL-t, és a `prisma generate` `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` hibával elszáll.

- [ ] **Step 2: A `Salon` modell bővítése**

A `prisma/schema.prisma`-ban a `Salon` modellben cseréld le ezt a részt:

```prisma
  isActive      Boolean   @default(true)
  inactivatedAt DateTime?
```

erre:

```prisma
  // Fiókszintű állapot. Írója KIZÁRÓLAG a fiókművelet-kaszkád
  // (admin tiltás, felhasználói inaktiválás és ezek visszaállítása).
  isActive      Boolean   @default(true)
  inactivatedAt DateTime?

  // A tulajdonos publikálási szándéka.
  // Írója KIZÁRÓLAG a tulajdonos: createSalon, publishSalon, unpublishSalon.
  isPublished   Boolean   @default(false)
  publishedAt   DateTime?

  // Rendszer általi publikálási tiltás.
  // Írója KIZÁRÓLAG a rendszer: előfizetés lejárat, adminisztrátori intézkedés.
  // Értékei: null | "BILLING" | "ADMIN"
  publishBlockedReason String?
  publishBlockedAt     DateTime?
```

- [ ] **Step 3: A `SubscriptionConfig` modell bővítése**

A `prisma/schema.prisma`-ban a `SubscriptionConfig` modellben a `freeMonthlyPostLimit` sor alá szúrd be:

```prisma
  // Fő kapcsoló. Amíg false, sem a lejáratás, sem a csomagkorlátok nem érvényesülnek.
  // 1. fázis (felfutás): false. 2. fázistól: true.
  billingEnabled Boolean @default(false)
```

- [ ] **Step 4: Migráció generálása**

Run: `npx prisma migrate dev --name add_salon_publishing_state --skip-seed`
Expected: `Applying migration ...add_salon_publishing_state`, majd `Your database is now in sync with your schema.`

Ha a `prisma generate` `EPERM` hibával áll le, az nem baj — a migráció ettől már lefutott. A generálást a következő lépés pótolja.

- [ ] **Step 5: Prisma kliens generálása**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client (v6.19.2)`

- [ ] **Step 6: Backfill SQL hozzáadása a migrációhoz**

Nyisd meg a most generált `prisma/migrations/<timestamp>_add_salon_publishing_state/migration.sql` fájlt, és a végére illeszd be:

```sql
-- Backfill: minden meglévő szalon publikáltnak számít.
-- A jelenlegi adatokban nincs inaktív szalon, ezért nincs kétértelmű eset arról,
-- hogy egy inaktív szalon előfizetés vagy fiók miatt lett-e az.
UPDATE "Salon"
SET "isPublished" = true,
    "publishedAt" = "createdAt"
WHERE "isActive" = true;

-- Backfill: előfizetési rekord pótlása azoknak a szalonoknak, amelyeknek nincs.
-- freeExpiresAt szándékosan NULL: az 1. fázisban semmi nem jár le.
INSERT INTO "Subscription" (
    "id", "salonId", "plan", "status", "billingCurrency",
    "freeStartedAt", "freeExpiresAt", "postWindowStart", "postCountInWindow",
    "cancelAtPeriodEnd", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text, s."id", 'FREE', 'ACTIVE', s."currency",
    NOW(), NULL, NOW(), 0,
    false, NOW(), NOW()
FROM "Salon" s
WHERE NOT EXISTS (SELECT 1 FROM "Subscription" sub WHERE sub."salonId" = s."id");

-- A konfigurációs singleton létrehozása, ha még nem létezik.
INSERT INTO "SubscriptionConfig" ("id", "billingEnabled", "updatedAt")
SELECT gen_random_uuid()::text, false, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "SubscriptionConfig");
```

- [ ] **Step 7: A backfill lefuttatása**

Mivel a migráció már alkalmazva lett a 4. lépésben, a backfill SQL-t egyszer kézzel kell lefuttatni a helyi adatbázison:

```bash
docker exec -i glowyspot-db psql -U $(grep POSTGRES_USER .env | cut -d= -f2 | tr -d '\r') -d $(grep POSTGRES_DB .env | cut -d= -f2 | tr -d '\r') < prisma/migrations/*_add_salon_publishing_state/migration.sql
```

Expected: `UPDATE 14`, `INSERT 0 11`, `INSERT 0 1` (a `ALTER TABLE` sorok hibát adnak, mert az oszlopok már léteznek — ez várt és figyelmen kívül hagyható).

- [ ] **Step 8: A backfill ellenőrzése**

```bash
docker exec glowyspot-db psql -U $(grep POSTGRES_USER .env | cut -d= -f2 | tr -d '\r') -d $(grep POSTGRES_DB .env | cut -d= -f2 | tr -d '\r') -c 'select count(*) filter (where "isPublished") as publikalt, count(*) as osszes, (select count(*) from "Subscription") as elofizetesek, (select count(*) from "SubscriptionConfig") as config from "Salon";'
```

Expected: `publikalt = 14`, `osszes = 14`, `elofizetesek = 14`, `config = 1`

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck`
Expected: hibamentes kimenet (csak a parancs fejléce jelenik meg)

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(salon): publikálási állapot mezők és backfill

A Salon három egymásra merőleges jelzőt kap, mindegyiknek egy írójával:
isActive (fiókszintű), isPublished (tulajdonosi szándék),
publishBlockedReason (rendszer általi tiltás). A SubscriptionConfig
billingEnabled kapcsolót kap, alapértelmezés false (1. fázis).

Backfill: minden meglévő szalon publikált, a hiányzó előfizetési
rekordok pótolva lejárat nélkül."
```

---

### Task 2: Láthatósági modul

**Files:**
- Create: `lib/salon-visibility.ts`
- Test: `tests/salon/salon-visibility.test.ts`

**Interfaces:**
- Consumes: `Salon.isActive`, `Salon.isPublished`, `Salon.publishBlockedReason` (Task 1).
- Produces:
  - `PUBLIC_SALON_WHERE: Prisma.SalonWhereInput` — where-töredék publikus lekérdezésekhez.
  - `isSalonPubliclyVisible(salon: SalonVisibilityFields): boolean` — egy betöltött rekord ellenőrzése.
  - `type SalonVisibilityFields = { isActive: boolean; isPublished: boolean; publishBlockedReason: string | null }`

- [ ] **Step 1: Write the failing test**

Create `tests/salon/salon-visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { PUBLIC_SALON_WHERE, isSalonPubliclyVisible } from "../../lib/salon-visibility"

describe("PUBLIC_SALON_WHERE", () => {
    it("mindhárom láthatósági feltételt tartalmazza", () => {
        expect(PUBLIC_SALON_WHERE).toEqual({
            isActive: true,
            isPublished: true,
            publishBlockedReason: null,
        })
    })
})

describe("isSalonPubliclyVisible", () => {
    it("látható, ha aktív, publikált és nincs tiltás", () => {
        expect(isSalonPubliclyVisible({
            isActive: true,
            isPublished: true,
            publishBlockedReason: null,
        })).toBe(true)
    })

    it.each([
        ["a tulajdonos fiókja inaktív", { isActive: false, isPublished: true, publishBlockedReason: null }],
        ["nincs publikálva", { isActive: true, isPublished: false, publishBlockedReason: null }],
        ["előfizetés miatt tiltva", { isActive: true, isPublished: true, publishBlockedReason: "BILLING" }],
        ["admin által tiltva", { isActive: true, isPublished: true, publishBlockedReason: "ADMIN" }],
    ])("rejtett, ha %s", (_leiras, salon) => {
        expect(isSalonPubliclyVisible(salon)).toBe(false)
    })

    it("rejtett, ha egyszerre több feltétel is sérül", () => {
        expect(isSalonPubliclyVisible({
            isActive: false,
            isPublished: false,
            publishBlockedReason: "BILLING",
        })).toBe(false)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salon/salon-visibility.test.ts`
Expected: FAIL — `Cannot find module '../../lib/salon-visibility'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/salon-visibility.ts`:

```ts
import type { Prisma } from "@prisma/client"

/**
 * A publikus szalon-láthatóság egyetlen igazságforrása.
 *
 * Három, egymástól független feltétel együttállása kell ahhoz, hogy egy szalon
 * látszódjon a látogatóknak. Minden feltételt más folyamat ír, ezért nem szabad
 * őket összevonni — pontosan ez az összemosás okozta korábban, hogy a fiók
 * visszaállítása feloldotta az előfizetés miatti tiltást is.
 */

export type SalonVisibilityFields = {
    isActive: boolean
    isPublished: boolean
    publishBlockedReason: string | null
}

/** Prisma where-töredék publikus szalon-lekérdezésekhez. */
export const PUBLIC_SALON_WHERE = {
    isActive: true,
    isPublished: true,
    publishBlockedReason: null,
} satisfies Prisma.SalonWhereInput

/**
 * Egy már betöltött szalon publikus láthatósága.
 * Fail-closed: minden feltételnek egyértelműen teljesülnie kell.
 */
export function isSalonPubliclyVisible(salon: SalonVisibilityFields): boolean {
    return salon.isActive === true
        && salon.isPublished === true
        && salon.publishBlockedReason === null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/salon/salon-visibility.test.ts`
Expected: PASS — 7 teszt zöld

- [ ] **Step 5: Commit**

```bash
git add lib/salon-visibility.ts tests/salon/salon-visibility.test.ts
git commit -m "feat(salon): közös publikus láthatósági szűrő

A láthatóság eddig hat helyen volt külön kódolva. Egyetlen where-töredék
és egy predikátum váltja ki, hogy egy második feltétel bevezetése ne
hagyhasson ki ágat."
```

---

### Task 3: Publikálási házirend

**Files:**
- Create: `lib/salon-publishing.ts`
- Modify: `lib/subscription.ts:15-36` (`DEFAULT_CONFIG` és `getSubscriptionConfig`)
- Test: `tests/salon/salon-publishing.test.ts`

**Interfaces:**
- Consumes: `SubscriptionConfig.billingEnabled` (Task 1).
- Produces:
  - `canPublishSalon(ownerId: string, salonId?: string): Promise<{ allowed: boolean; reason?: string }>`
  - `getSubscriptionConfig()` bővül a `billingEnabled: boolean` mezővel.

- [ ] **Step 1: A `billingEnabled` felvétele a konfigurációba**

A `lib/subscription.ts`-ben cseréld le a `DEFAULT_CONFIG` konstanst:

```ts
export const DEFAULT_CONFIG = {
  freeTrialDays: 60,       // 2 hónap
  freeMonthlyPostLimit: 5, // 5 poszt / 30 nap
  billingEnabled: false,   // 1. fázis: minden ingyenes, semmi nem jár le
}
```

Majd a `getSubscriptionConfig()` visszatérési objektumában a `freeMonthlyPostLimit` sor alá szúrd be:

```ts
    billingEnabled: config?.billingEnabled ?? DEFAULT_CONFIG.billingEnabled,
```

- [ ] **Step 2: Write the failing test**

Create `tests/salon/salon-publishing.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    getSubscriptionConfig: vi.fn(),
    prisma: {
        salon: {
            count: vi.fn(),
        },
    },
}))

vi.mock("@/lib/db", () => ({
    default: mocks.prisma,
}))

vi.mock("@/lib/subscription", () => ({
    getSubscriptionConfig: mocks.getSubscriptionConfig,
}))

import { canPublishSalon } from "../../lib/salon-publishing"

describe("canPublishSalon", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("1. fázisban (billingEnabled=false) engedélyez az első szalonnál", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue({ billingEnabled: false })
        mocks.prisma.salon.count.mockResolvedValue(0)

        await expect(canPublishSalon("owner-1")).resolves.toEqual({ allowed: true })
    })

    it("1. fázisban tetszőleges számú további szalonnál is engedélyez", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue({ billingEnabled: false })
        mocks.prisma.salon.count.mockResolvedValue(25)

        await expect(canPublishSalon("owner-1")).resolves.toEqual({ allowed: true })
    })

    it("1. fázisban meg sem számolja a szalonokat", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue({ billingEnabled: false })

        await canPublishSalon("owner-1")

        expect(mocks.prisma.salon.count).not.toHaveBeenCalled()
    })

    it("2. fázisra előkészítve: billingEnabled=true esetén is engedélyez, amíg nincs kvóta-házirend", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue({ billingEnabled: true })

        await expect(canPublishSalon("owner-1")).resolves.toEqual({ allowed: true })
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/salon/salon-publishing.test.ts`
Expected: FAIL — `Cannot find module '../../lib/salon-publishing'`

- [ ] **Step 4: Write minimal implementation**

Create `lib/salon-publishing.ts`:

```ts
import { getSubscriptionConfig } from "@/lib/subscription"

/**
 * A publikálási házirend — a fizetős fázisok varrata.
 *
 * Az 1. fázisban (billingEnabled=false) minden publikálás engedélyezett.
 * A 2. fázisban itt fog megjelenni az ingyenes szalonhelyek kvótája, a hívási
 * helyek (createSalon, publishSalon) módosítása nélkül.
 */

export type PublishPolicyResult = {
    allowed: boolean
    reason?: string
}

/**
 * Publikálhatja-e a megadott tulajdonos a szalonját?
 *
 * @param ownerId A szalon tulajdonosának azonosítója.
 * @param salonId A publikálandó szalon azonosítója. Újonnan létrehozott
 *   szalonnál elhagyható. A kvóta-számoláshoz lesz szükséges a 2. fázisban,
 *   hogy a már publikált szalon újrapublikálása ne számítson új helynek.
 */
export async function canPublishSalon(
    ownerId: string,
    salonId?: string
): Promise<PublishPolicyResult> {
    const config = await getSubscriptionConfig()

    // 1. fázis: minden szalon ingyenesen publikálható.
    if (!config.billingEnabled) {
        return { allowed: true }
    }

    // 2. fázis: ide kerül az ingyenes szalonhelyek kvótája.
    // A kvóta-házirend külön csomag (C), addig a kapcsoló bekapcsolása
    // sem korlátozza a publikálást.
    void ownerId
    void salonId
    return { allowed: true }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/salon/salon-publishing.test.ts`
Expected: PASS — 4 teszt zöld

- [ ] **Step 6: Commit**

```bash
git add lib/salon-publishing.ts lib/subscription.ts tests/salon/salon-publishing.test.ts
git commit -m "feat(salon): publikálási házirend és billingEnabled kapcsoló

A canPublishSalon a fizetős fázisok varrata: az 1. fázisban mindig
engedélyez, a 2. fázis csak a házirendet cseréli, nem a hívási helyeket."
```

---

### Task 4: Publikus lekérdezések átállítása a közös szűrőre

**Files:**
- Modify: `lib/actions/salon.ts` (7 hely: 630, 648, 711, 735, 741, 806, 1374 — a sorszámok a Task 1-2 előtti állapotra vonatkoznak, keresd a mintát)
- Test: `tests/salon/salon-public-queries.test.ts`

**Interfaces:**
- Consumes: `PUBLIC_SALON_WHERE`, `isSalonPubliclyVisible` (Task 2).
- Produces: nincs új export; a meglévő publikus lekérdezések viselkedése szigorodik.

- [ ] **Step 1: Write the failing test**

Create `tests/salon/salon-public-queries.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireSession: vi.fn(),
    requireAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    writeAuditLog: vi.fn(),
    prisma: {
        salon: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
        post: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
    },
}))

vi.mock("@/lib/auth-utils", () => ({
    requireSession: mocks.requireSession,
    requireAdminSession: mocks.requireAdminSession,
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_t, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

vi.mock("@/lib/subscription", () => ({
    generateSalonFingerprint: vi.fn(() => "fingerprint"),
    checkFingerprintDuplicate: vi.fn(() => ({ duplicate: false })),
    initSubscription: vi.fn(),
    canCreatePost: vi.fn(() => ({ allowed: true })),
    incrementPostCount: vi.fn(),
    canUploadVideo: vi.fn(() => ({ allowed: true })),
    getSubscriptionConfig: vi.fn(async () => ({ billingEnabled: false })),
}))

vi.mock("@/lib/slug", () => ({ generateUniqueSlug: vi.fn(() => "test-salon") }))

vi.mock("@/lib/booking/booking-policy", () => ({
    canAcceptBookingRequest: vi.fn(() => ({ allowed: true })),
    canCancelMyBooking: vi.fn(() => ({ allowed: true })),
    canHandleBookingRequest: vi.fn(() => ({ allowed: true })),
    formatBookingDecisionMessage: vi.fn(() => ({ subject: "", content: "" })),
    formatBookingVisitorCancellationMessage: vi.fn(() => ({ subject: "", content: "" })),
    validateBookingRequestFields: vi.fn(() => ({ allowed: true })),
}))

import { getAllSalons, getPublicSalonData, getRecentSalons } from "../../lib/actions/salon"

/** Minden publikus lekérdezésnek mindhárom láthatósági feltételt tartalmaznia kell. */
function expectPublicFilter(where: Record<string, unknown>) {
    expect(where).toMatchObject({
        isActive: true,
        isPublished: true,
        publishBlockedReason: null,
    })
}

describe("publikus szalon-lekérdezések láthatósági szűrése", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.prisma.salon.findMany.mockResolvedValue([])
        mocks.prisma.salon.findFirst.mockResolvedValue(null)
    })

    it("getAllSalons a teljes publikus szűrőt használja", async () => {
        await getAllSalons()

        expectPublicFilter(mocks.prisma.salon.findMany.mock.calls[0][0].where)
    })

    it("getRecentSalons a teljes publikus szűrőt használja", async () => {
        await getRecentSalons(4)

        expectPublicFilter(mocks.prisma.salon.findMany.mock.calls[0][0].where)
    })

    it("getPublicSalonData a teljes publikus szűrőt használja a slug mellett", async () => {
        await getPublicSalonData("teszt-szalon")

        const where = mocks.prisma.salon.findFirst.mock.calls[0][0].where
        expect(where).toMatchObject({ slug: "teszt-szalon" })
        expectPublicFilter(where)
    })

    it("getPublicSalonData null-t ad nem látható szalonra", async () => {
        mocks.prisma.salon.findFirst.mockResolvedValue(null)

        await expect(getPublicSalonData("rejtett-szalon")).resolves.toBeNull()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salon/salon-public-queries.test.ts`
Expected: FAIL — a `where` objektum csak `{ isActive: true }` értéket tartalmaz, hiányzik az `isPublished` és a `publishBlockedReason`

- [ ] **Step 3: Import hozzáadása**

A `lib/actions/salon.ts` importjai közé, a `generateUniqueSlug` import alá:

```ts
import { PUBLIC_SALON_WHERE, isSalonPubliclyVisible } from "@/lib/salon-visibility"
```

- [ ] **Step 4: A hat szalon-lekérdezés átállítása**

`getAllSalons` — cseréld:

```ts
            where: { isActive: true }
```

erre:

```ts
            where: { ...PUBLIC_SALON_WHERE }
```

`getFeaturedSalons` — cseréld:

```ts
        const baseWhere: Prisma.SalonWhereInput = { isActive: true }
```

erre:

```ts
        const baseWhere: Prisma.SalonWhereInput = { ...PUBLIC_SALON_WHERE }
```

`getRecentSalons` — cseréld:

```ts
            where: { isActive: true },
```

erre:

```ts
            where: { ...PUBLIC_SALON_WHERE },
```

`getPublicSalonData` — cseréld:

```ts
            where: {
                slug,
                isActive: true
            },
```

erre:

```ts
            where: {
                slug,
                ...PUBLIC_SALON_WHERE
            },
```

A `getPublicSalonData`-n belüli `posts: { where: { isActive: true } }` és a `getRecentPosts`-beli `const where: Prisma.PostWhereInput = { isActive: true }` **nem** változik: ezek a `Post.isActive` mezőre vonatkoznak, nem a szalonra.

- [ ] **Step 5: A `getRecentPosts` szalon-szűrésének kiegészítése**

A `getRecentPosts`-ban a poszt-szűrő mellé a szalon láthatóságát is érvényesíteni kell, különben egy nem publikált szalon posztjai megjelennének a nyitóoldali feedben. A `const where: Prisma.PostWhereInput = { isActive: true }` sor után szúrd be:

```ts
    // A nem publikált szalonok posztjai nem jelenhetnek meg a publikus feedben.
    where.salon = { ...PUBLIC_SALON_WHERE }
```

- [ ] **Step 6: A foglalási guard átállítása**

A `createBooking`-ban cseréld a szalon-lekérdezés `select` blokkját:

```ts
        select: {
            id: true,
            ownerId: true,
            isActive: true,
            allowBookings: true,
        }
```

erre:

```ts
        select: {
            id: true,
            ownerId: true,
            isActive: true,
            isPublished: true,
            publishBlockedReason: true,
            allowBookings: true,
        }
```

Majd cseréld ezt a sort:

```ts
    if (!salon.isActive) throw new Error("Inaktív szalonhoz nem lehet foglalást létrehozni.")
```

erre:

```ts
    if (!isSalonPubliclyVisible(salon)) throw new Error("Ez a szalon jelenleg nem érhető el.")
```

- [ ] **Step 7: A szalon-kontextusú üzenetküldés guardja**

A `sendMessage`-ben, a `const content = requireNonEmptyText(data.content, "Üzenet")` sor után szúrd be:

```ts
    // Szalon-kontextusú üzenet csak látható szalonnak küldhető.
    if (data.salonId) {
        const salon = await prisma.salon.findUnique({
            where: { id: data.salonId },
            select: { isActive: true, isPublished: true, publishBlockedReason: true },
        })
        if (!salon || !isSalonPubliclyVisible(salon)) {
            throw new Error("Ez a szalon jelenleg nem érhető el.")
        }
    }
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/salon/salon-public-queries.test.ts`
Expected: PASS — 4 teszt zöld

- [ ] **Step 9: A teljes tesztkészlet és a typecheck**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: minden teszt zöld, typecheck és lint hibamentes

- [ ] **Step 10: Commit**

```bash
git add lib/actions/salon.ts tests/salon/salon-public-queries.test.ts
git commit -m "feat(salon): publikus lekérdezések a közös láthatósági szűrőre

A hat szétszórt isActive feltétel helyett mindenhol PUBLIC_SALON_WHERE.
A feed poszt-lekérdezése, a foglalás és a szalon-kontextusú üzenetküldés
is a szalon láthatóságát ellenőrzi."
```

---

### Task 5: Lejáratás és csomagkorlátok a publikálási tiltásra

**Files:**
- Modify: `lib/audit-log.ts` (`AUDIT_ACTIONS` bővítése)
- Modify: `lib/subscription.ts` (`expireFreeSalons`, `canCreatePost`, `canUploadVideo`)
- Test: `tests/salon/subscription-billing-gate.test.ts`

**Interfaces:**
- Consumes: `SubscriptionConfig.billingEnabled` (Task 1), `Salon.publishBlockedReason` (Task 1).
- Produces:
  - `expireFreeSalons()` a továbbiakban `publishBlockedReason`-t ír, nem `isActive`-ot.
  - Új `AUDIT_ACTIONS` kulcsok, amelyekre a Task 7 is épül: `SALON_PUBLISH`, `SALON_UNPUBLISH`, `SALON_PUBLISH_BLOCKED`, `SALON_BILLING_BLOCKED`.

- [ ] **Step 0: Új naplózási események felvétele**

A `lib/audit-log.ts`-ben az `AUDIT_ACTIONS` objektumban a `SALON_PROFILE_VIEW` sor alá szúrd be:

```ts
    SALON_PUBLISH: "SALON_PUBLISH",
    SALON_UNPUBLISH: "SALON_UNPUBLISH",
    SALON_PUBLISH_BLOCKED: "SALON_PUBLISH_BLOCKED",
    SALON_BILLING_BLOCKED: "SALON_BILLING_BLOCKED",
```

Mind a négy kulcs itt jön létre; a `SALON_BILLING_BLOCKED`-ot ez a task használja, a másik hármat a Task 7.

- [ ] **Step 1: Write the failing test**

Create `tests/salon/subscription-billing-gate.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    writeAuditLog: vi.fn(),
    prisma: {
        subscription: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            updateMany: vi.fn(),
        },
        salon: {
            updateMany: vi.fn(),
        },
        subscriptionConfig: {
            findFirst: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_t, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

import { canCreatePost, canUploadVideo, expireFreeSalons } from "../../lib/subscription"

describe("billingEnabled kapcsoló", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.prisma.$transaction.mockResolvedValue([])
    })

    describe("1. fázis (billingEnabled=false)", () => {
        beforeEach(() => {
            mocks.prisma.subscriptionConfig.findFirst.mockResolvedValue({ billingEnabled: false })
        })

        it("az expireFreeSalons nem módosít semmit", async () => {
            await expect(expireFreeSalons()).resolves.toBe(0)

            expect(mocks.prisma.subscription.findMany).not.toHaveBeenCalled()
            expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
        })

        it("a poszt-limit nem érvényesül lejárt előfizetésnél sem", async () => {
            mocks.prisma.subscription.findUnique.mockResolvedValue({
                plan: "FREE",
                status: "INACTIVE",
                postCountInWindow: 999,
                postWindowStart: new Date(),
            })

            await expect(canCreatePost("salon-1")).resolves.toEqual({ allowed: true })
        })

        it("a videófeltöltés engedélyezett FREE csomagnál is", async () => {
            mocks.prisma.subscription.findUnique.mockResolvedValue({ plan: "FREE", status: "ACTIVE" })

            await expect(canUploadVideo("salon-1")).resolves.toEqual({ allowed: true })
        })
    })

    describe("2. fázis (billingEnabled=true)", () => {
        beforeEach(() => {
            mocks.prisma.subscriptionConfig.findFirst.mockResolvedValue({
                billingEnabled: true,
                freeMonthlyPostLimit: 5,
                freeTrialDays: 60,
            })
        })

        it("az expireFreeSalons publishBlockedReason-t ír, nem isActive-ot", async () => {
            mocks.prisma.subscription.findMany.mockResolvedValue([{ salonId: "salon-1" }])

            await expireFreeSalons()

            const salonUpdate = mocks.prisma.salon.updateMany.mock.calls[0][0]
            expect(salonUpdate.data).toMatchObject({ publishBlockedReason: "BILLING" })
            expect(salonUpdate.data).not.toHaveProperty("isActive")
            expect(salonUpdate.data).not.toHaveProperty("inactivatedAt")
        })

        it("naplózza a tiltást", async () => {
            mocks.prisma.subscription.findMany.mockResolvedValue([{ salonId: "salon-1" }])

            await expireFreeSalons()

            expect(mocks.writeAuditLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: "SALON_BILLING_BLOCKED",
                    entity: "Salon",
                    entityId: "salon-1",
                })
            )
        })

        it("hiányzó előfizetési rekord esetén fail-closed", async () => {
            mocks.prisma.subscription.findUnique.mockResolvedValue(null)

            const result = await canCreatePost("salon-1")
            expect(result.allowed).toBe(false)
        })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salon/subscription-billing-gate.test.ts`
Expected: FAIL — az `expireFreeSalons` lefut és `isActive: false`-t ír, a `canCreatePost` pedig `allowed: true`-t ad hiányzó rekordra

- [ ] **Step 3: Az `expireFreeSalons` átírása**

A `lib/subscription.ts`-ben cseréld le a teljes `expireFreeSalons` függvényt:

```ts
export async function expireFreeSalons(): Promise<number> {
  const config = await getSubscriptionConfig()

  // 1. fázis: a lejáratás ki van kapcsolva, minden szalon ingyenesen publikálható.
  if (!config.billingEnabled) return 0

  const now = new Date()

  // Megkeressük a lejárt, még aktív FREE szalonokat
  const expired = await prisma.subscription.findMany({
    where: {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      freeExpiresAt: { lte: now },
    },
    select: { salonId: true },
  })

  if (expired.length === 0) return 0

  const salonIds = expired.map((s) => s.salonId)

  // A szalonra publikálási tiltást írunk, NEM isActive-ot.
  // Az isActive fiókszintű mező; ha ide írnánk, a fiók visszaállítása
  // feloldaná az előfizetés miatti tiltást is.
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { salonId: { in: salonIds } },
      data: { status: SubscriptionStatus.INACTIVE },
    }),
    prisma.salon.updateMany({
      where: { id: { in: salonIds } },
      data: { publishBlockedReason: "BILLING", publishBlockedAt: now },
    }),
  ])

  // Szalononként külön bejegyzés, hogy az admin nézetben az entityId szerint
  // vissza lehessen keresni, mikor és miért tiltódott egy konkrét szalon.
  for (const salonId of salonIds) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.SALON_BILLING_BLOCKED,
      entity: "Salon",
      entityId: salonId,
      metadata: { reason: "FREE_TRIAL_EXPIRED" },
    })
  }

  return expired.length
}
```

A `lib/subscription.ts` importjai közé vedd fel:

```ts
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit-log"
```

- [ ] **Step 4: A `canCreatePost` kapuzása**

A `lib/subscription.ts`-ben a `canCreatePost` elején cseréld le ezt:

```ts
  const sub = await getSalonSubscription(salonId)

  // Ha nincs sub rekord, Free-ként kezeljük (régi szalon)
  if (!sub) {
    return { allowed: true } // backward compat
  }
```

erre:

```ts
  const config = await getSubscriptionConfig()

  // 1. fázis: nincs csomagkorlát.
  if (!config.billingEnabled) return { allowed: true }

  const sub = await getSalonSubscription(salonId)

  // Fail-closed: a backfill után nem lehet rekord nélküli szalon,
  // ezért a hiánya adathibát jelent, nem korlátlan használatot.
  if (!sub) {
    return { allowed: false, reason: "Az előfizetés nem található. Kérjük vegye fel a kapcsolatot az ügyfélszolgálattal." }
  }
```

**Fontos:** a `canCreatePost` törzsében lejjebb, a „FREE: 30 napos gördülő ablak ellenőrzés" komment alatt már szerepel egy `const config = await getSubscriptionConfig()` sor. Ezt a sort **töröld**, különben a TypeScript `Cannot redeclare block-scoped variable 'config'` hibát ad. A fentebb bevezetett `config` változó ugyanazt az objektumot tartalmazza, tehát a `config.freeMonthlyPostLimit` hivatkozás változatlanul működik.

- [ ] **Step 5: A `canUploadVideo` kapuzása**

A `lib/subscription.ts`-ben a `canUploadVideo` elején, a `const sub = await getSalonSubscription(salonId)` sor **elé** szúrd be:

```ts
  const config = await getSubscriptionConfig()

  // 1. fázis: nincs csomagkorlát, a videófeltöltés mindenkinek elérhető.
  if (!config.billingEnabled) return { allowed: true }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/salon/subscription-billing-gate.test.ts`
Expected: PASS — 5 teszt zöld

- [ ] **Step 7: Commit**

```bash
git add lib/subscription.ts tests/salon/subscription-billing-gate.test.ts
git commit -m "feat(subscription): lejáratás publikálási tiltásra, billingEnabled kapuzás

Az expireFreeSalons ezentúl publishBlockedReason='BILLING' értéket ír a
korábbi isActive=false helyett. Ezzel a fiók visszaállítása nem tudja
feloldani az előfizetés miatti tiltást.

A csomagkorlátok a billingEnabled kapcsolóhoz kötöttek, és bekapcsolt
állapotban hiányzó előfizetési rekord esetén fail-closed viselkednek."
```

---

### Task 6: A visszaállítási rés regressziós tesztje

**Files:**
- Test: `tests/auth/account-restore-billing-block.test.ts`
- Modify: `lib/actions/user.ts` és `lib/auth-options.ts` — csak akkor, ha a teszt hibát talál

**Interfaces:**
- Consumes: Task 1 mezői, Task 5 átírt `expireFreeSalons`-a.
- Produces: nincs új export. Ez a task rögzíti, hogy a spec 2.2 pontjában leírt rés lezárult.

Ez a terv legfontosabb tesztje. A Task 5 után a rés elvben magától megszűnik, mert a lejáratás már nem az `inactivatedAt` mezőt írja, amire a visszaállítás szűr. Ez a task ezt bizonyítja, és megakadályozza a visszacsúszást.

- [ ] **Step 1: Write the failing test**

Create `tests/auth/account-restore-billing-block.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireSession: vi.fn(),
    requireAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    writeAuditLog: vi.fn(),
    tx: {
        user: { update: vi.fn() },
        salon: { updateMany: vi.fn(), findMany: vi.fn() },
        post: { updateMany: vi.fn() },
    },
    prisma: {
        user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
        $transaction: vi.fn(),
    },
}))

vi.mock("@/lib/auth-utils", () => ({
    requireSession: mocks.requireSession,
    requireAdminSession: mocks.requireAdminSession,
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_t, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

vi.mock("@/lib/auth/role-policy", () => ({
    canDeactivateAdminUser: vi.fn(() => ({ allowed: true })),
    canDeleteAdminUser: vi.fn(() => ({ allowed: true })),
    canRemoveAdminRole: vi.fn(() => ({ allowed: true })),
    isUserRole: vi.fn(() => true),
}))

import { restoreAccount, toggleUserActiveAdmin } from "../../lib/actions/user"

const USER_ID = "provider-1"

/**
 * Minden szalon-visszaállító hívás vizsgálata: sem a szűrő, sem az írt adat
 * nem érintheti a publikálási mezőket.
 */
function expectDoesNotTouchPublishingFields() {
    for (const call of mocks.tx.salon.updateMany.mock.calls) {
        const { where, data } = call[0]
        expect(data).not.toHaveProperty("publishBlockedReason")
        expect(data).not.toHaveProperty("publishBlockedAt")
        expect(data).not.toHaveProperty("isPublished")
        expect(where).not.toHaveProperty("publishBlockedReason")
        expect(where).not.toHaveProperty("isPublished")
    }
}

describe("fiók-visszaállítás nem oldja fel az előfizetési tiltást", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.requireSession.mockResolvedValue(USER_ID)
        mocks.requireAdminSession.mockResolvedValue({ id: "admin-1", role: "admin" })
        mocks.tx.salon.findMany.mockResolvedValue([])
        mocks.prisma.$transaction.mockImplementation(
            (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx)
        )
    })

    it("a restoreAccount csak a fiókszintű mezőket állítja vissza", async () => {
        await restoreAccount(USER_ID)

        expectDoesNotTouchPublishingFields()
        expect(mocks.tx.salon.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isActive: true, inactivatedAt: null } })
        )
    })

    it("az adminisztrátori feloldás csak a fiókszintű mezőket állítja vissza", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({ isActive: false, role: "provider" })

        await toggleUserActiveAdmin(USER_ID)

        expectDoesNotTouchPublishingFields()
    })
})
```

- [ ] **Step 2: Run test to verify current behaviour**

Run: `npx vitest run tests/auth/account-restore-billing-block.test.ts`
Expected: PASS — a Task 5 után a visszaállítási kód már nem érinti a publikálási mezőket. Ha bármelyik eset FAIL, az azt jelenti, hogy a `lib/actions/user.ts`-ben maradt egy publikálási mezőt író ág; ilyenkor a 3. lépés javítja.

- [ ] **Step 3: Javítás, ha a teszt bukik**

Ha a 2. lépés FAIL-t adott, keresd meg a `lib/actions/user.ts`-ben azt a `tx.salon.updateMany` hívást, amelynek `data` vagy `where` objektuma publikálási mezőt említ, és távolítsd el belőle. A fiókműveletek kizárólag az `isActive` és `inactivatedAt` mezőket kezelhetik. Ha a 2. lépés PASS volt, ugorj a 4. lépésre.

- [ ] **Step 4: Az `auth-options.ts` visszaállító ágának ellenőrzése**

Nyisd meg a `lib/auth-options.ts`-t, és ellenőrizd, hogy a `signIn` callback szalon-visszaállító hívása így néz ki:

```ts
                await prisma.salon.updateMany({
                    where: { ownerId: dbUser.id, inactivatedAt: { not: null } },
                    data: { isActive: true, inactivatedAt: null }
                })
```

Ez helyes: a szűrő az `inactivatedAt`-re néz, amit a Task 5 után már csak a fiókműveletek írnak, az `expireFreeSalons` nem. Ha a `data` bármilyen publikálási mezőt tartalmaz, töröld onnan.

- [ ] **Step 5: A teljes tesztkészlet**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: minden teszt zöld, typecheck és lint hibamentes

- [ ] **Step 6: Commit**

```bash
git add tests/auth/account-restore-billing-block.test.ts lib/actions/user.ts lib/auth-options.ts
git commit -m "test(auth): a fiók-visszaállítás nem oldhatja fel az előfizetési tiltást

Regressziós teszt a spec 2.2 pontjában leírt bevételi résre: lejárt
előfizetésű szalon nem éledhet újra a tulajdonos fiókjának
visszaállításakor, sem önkéntes, sem adminisztrátori úton."
```

---

### Task 7: Publikálási szerver action-ök

**Files:**
- Modify: `lib/actions/salon.ts` (két új exportált függvény)
- Test: `tests/salon/salon-publish-actions.test.ts`

**Interfaces:**
- Consumes: `canPublishSalon()` (Task 3), a `SALON_PUBLISH` / `SALON_UNPUBLISH` / `SALON_PUBLISH_BLOCKED` `AUDIT_ACTIONS` kulcsok (Task 5), `requireSalonOwner()` (meglévő, `lib/actions/salon.ts`, visszatérési értéke a tulajdonos `string` azonosítója), `writeAuditLog()` (meglévő).
- Produces:
  - `publishSalon(salonId: string): Promise<{ success: boolean; error?: string }>`
  - `unpublishSalon(salonId: string): Promise<{ success: boolean }>`

A naplózási kulcsok már léteznek a Task 5 óta, itt nem kell őket felvenni.

- [ ] **Step 2: Write the failing test**

Create `tests/salon/salon-publish-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireSession: vi.fn(),
    requireAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    writeAuditLog: vi.fn(),
    canPublishSalon: vi.fn(),
    prisma: {
        salon: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}))

vi.mock("@/lib/auth-utils", () => ({
    requireSession: mocks.requireSession,
    requireAdminSession: mocks.requireAdminSession,
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_t, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

vi.mock("@/lib/salon-publishing", () => ({ canPublishSalon: mocks.canPublishSalon }))

vi.mock("@/lib/subscription", () => ({
    generateSalonFingerprint: vi.fn(() => "fingerprint"),
    checkFingerprintDuplicate: vi.fn(() => ({ duplicate: false })),
    initSubscription: vi.fn(),
    canCreatePost: vi.fn(() => ({ allowed: true })),
    incrementPostCount: vi.fn(),
    canUploadVideo: vi.fn(() => ({ allowed: true })),
    getSubscriptionConfig: vi.fn(async () => ({ billingEnabled: false })),
}))

vi.mock("@/lib/slug", () => ({ generateUniqueSlug: vi.fn(() => "test-salon") }))

vi.mock("@/lib/booking/booking-policy", () => ({
    canAcceptBookingRequest: vi.fn(() => ({ allowed: true })),
    canCancelMyBooking: vi.fn(() => ({ allowed: true })),
    canHandleBookingRequest: vi.fn(() => ({ allowed: true })),
    formatBookingDecisionMessage: vi.fn(() => ({ subject: "", content: "" })),
    formatBookingVisitorCancellationMessage: vi.fn(() => ({ subject: "", content: "" })),
    validateBookingRequestFields: vi.fn(() => ({ allowed: true })),
}))

import { publishSalon, unpublishSalon } from "../../lib/actions/salon"

const OWNER_ID = "owner-1"
const SALON_ID = "salon-1"

describe("publishSalon / unpublishSalon", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.requireSession.mockResolvedValue(OWNER_ID)
        mocks.prisma.salon.findUnique.mockResolvedValue({
            ownerId: OWNER_ID,
            publishedAt: null,
            publishBlockedReason: null,
        })
        mocks.prisma.salon.update.mockResolvedValue({ id: SALON_ID })
        mocks.canPublishSalon.mockResolvedValue({ allowed: true })
    })

    it("publikálásnál beállítja az isPublished és publishedAt mezőket", async () => {
        await expect(publishSalon(SALON_ID)).resolves.toEqual({ success: true })

        const updateArg = mocks.prisma.salon.update.mock.calls[0][0]
        expect(updateArg.data.isPublished).toBe(true)
        expect(updateArg.data.publishedAt).toBeInstanceOf(Date)
    })

    it("újrapublikáláskor nem írja felül a korábbi publishedAt értéket", async () => {
        const eredeti = new Date("2026-01-01T00:00:00.000Z")
        mocks.prisma.salon.findUnique.mockResolvedValue({
            ownerId: OWNER_ID,
            publishedAt: eredeti,
            publishBlockedReason: null,
        })

        await publishSalon(SALON_ID)

        expect(mocks.prisma.salon.update.mock.calls[0][0].data).not.toHaveProperty("publishedAt")
    })

    it("elutasítja a publikálást, ha a házirend tiltja", async () => {
        mocks.canPublishSalon.mockResolvedValue({ allowed: false, reason: "Elérted a keretet." })

        await expect(publishSalon(SALON_ID)).resolves.toEqual({
            success: false,
            error: "Elérted a keretet.",
        })
        expect(mocks.prisma.salon.update).not.toHaveBeenCalled()
    })

    it("elutasítja a publikálást, ha a szalon rendszer által tiltott", async () => {
        mocks.prisma.salon.findUnique.mockResolvedValue({
            ownerId: OWNER_ID,
            publishedAt: null,
            publishBlockedReason: "BILLING",
        })

        const result = await publishSalon(SALON_ID)
        expect(result.success).toBe(false)
        expect(mocks.prisma.salon.update).not.toHaveBeenCalled()
    })

    it("levételkor csak az isPublished mezőt állítja, a publishedAt marad", async () => {
        await expect(unpublishSalon(SALON_ID)).resolves.toEqual({ success: true })

        const updateArg = mocks.prisma.salon.update.mock.calls[0][0]
        expect(updateArg.data).toEqual({ isPublished: false })
    })

    it("idegen szalon publikálását elutasítja", async () => {
        mocks.prisma.salon.findUnique.mockResolvedValue({
            ownerId: "masik-tulajdonos",
            publishedAt: null,
            publishBlockedReason: null,
        })

        await expect(publishSalon(SALON_ID)).rejects.toThrow()
        expect(mocks.prisma.salon.update).not.toHaveBeenCalled()
    })

    it("idegen szalon levételét elutasítja", async () => {
        mocks.prisma.salon.findUnique.mockResolvedValue({
            ownerId: "masik-tulajdonos",
            publishedAt: null,
            publishBlockedReason: null,
        })

        await expect(unpublishSalon(SALON_ID)).rejects.toThrow()
        expect(mocks.prisma.salon.update).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/salon/salon-publish-actions.test.ts`
Expected: FAIL — `publishSalon is not a function`

- [ ] **Step 4: Import hozzáadása**

A `lib/actions/salon.ts` importjai közé:

```ts
import { canPublishSalon } from "@/lib/salon-publishing"
```

- [ ] **Step 5: A két action implementálása**

A `lib/actions/salon.ts`-ben, közvetlenül az `updateSalon` függvény **után** szúrd be:

```ts
/**
 * Publikálja a szalont, ha a házirend engedi és nincs rendszerszintű tiltás.
 * A publishedAt az ELSŐ publikálás időpontja marad, újrapublikálás nem írja felül.
 */
export async function publishSalon(salonId: string) {
    const ownerId = await requireSalonOwner(salonId)

    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { publishedAt: true, publishBlockedReason: true },
    })
    if (!salon) throw new Error("A szalon nem található.")

    if (salon.publishBlockedReason) {
        const reason = salon.publishBlockedReason === "BILLING"
            ? "A szalon publikálása előfizetési okból le van tiltva."
            : "A szalon publikálása adminisztrátori döntés miatt le van tiltva."

        await writeAuditLog({
            action: AUDIT_ACTIONS.SALON_PUBLISH_BLOCKED,
            userId: ownerId,
            entity: "Salon",
            entityId: salonId,
            metadata: { blockedReason: salon.publishBlockedReason },
            ...(await getAuditActionContext()),
        })
        return { success: false, error: reason }
    }

    const policy = await canPublishSalon(ownerId, salonId)
    if (!policy.allowed) {
        await writeAuditLog({
            action: AUDIT_ACTIONS.SALON_PUBLISH_BLOCKED,
            userId: ownerId,
            entity: "Salon",
            entityId: salonId,
            metadata: { policyReason: policy.reason ?? null },
            ...(await getAuditActionContext()),
        })
        return { success: false, error: policy.reason ?? "A szalon jelenleg nem publikálható." }
    }

    await prisma.salon.update({
        where: { id: salonId },
        data: salon.publishedAt
            ? { isPublished: true }
            : { isPublished: true, publishedAt: new Date() },
    })

    await writeAuditLog({
        action: AUDIT_ACTIONS.SALON_PUBLISH,
        userId: ownerId,
        entity: "Salon",
        entityId: salonId,
        ...(await getAuditActionContext()),
    })

    revalidatePath("/dashboard/salons")
    return { success: true }
}

/**
 * Levonja a szalont a publikus felületről.
 * A publishedAt szándékosan megmarad: az első publikálás időpontja később
 * a statisztikákhoz és a türelmi idő számításához kell.
 */
export async function unpublishSalon(salonId: string) {
    const ownerId = await requireSalonOwner(salonId)

    await prisma.salon.update({
        where: { id: salonId },
        data: { isPublished: false },
    })

    await writeAuditLog({
        action: AUDIT_ACTIONS.SALON_UNPUBLISH,
        userId: ownerId,
        entity: "Salon",
        entityId: salonId,
        ...(await getAuditActionContext()),
    })

    revalidatePath("/dashboard/salons")
    return { success: true }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/salon/salon-publish-actions.test.ts`
Expected: PASS — 7 teszt zöld

- [ ] **Step 7: Commit**

```bash
git add lib/actions/salon.ts lib/audit-log.ts tests/salon/salon-publish-actions.test.ts
git commit -m "feat(salon): publishSalon és unpublishSalon action-ök

Tulajdonosi publikálás és levétel, a canPublishSalon házirenden
keresztül, naplózással. A publishedAt az első publikálás időpontja
marad, a levétel nem törli."
```

---

### Task 8: A `createSalon` átállítása a házirendre

**Files:**
- Modify: `lib/actions/salon.ts` (`createSalon`)
- Test: `tests/salon/salon-create-publishing.test.ts`

**Interfaces:**
- Consumes: `canPublishSalon()` (Task 3).
- Produces: a `createSalon` a létrehozott szalon publikálási állapotát a házirend alapján állítja be.

- [ ] **Step 1: Write the failing test**

Create `tests/salon/salon-create-publishing.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireSession: vi.fn(),
    requireAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    writeAuditLog: vi.fn(),
    canPublishSalon: vi.fn(),
    initSubscription: vi.fn(),
    prisma: {
        salon: { create: vi.fn(), findUnique: vi.fn() },
    },
}))

vi.mock("@/lib/auth-utils", () => ({
    requireSession: mocks.requireSession,
    requireAdminSession: mocks.requireAdminSession,
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_t, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

vi.mock("@/lib/salon-publishing", () => ({ canPublishSalon: mocks.canPublishSalon }))

vi.mock("@/lib/subscription", () => ({
    generateSalonFingerprint: vi.fn(() => "fingerprint"),
    checkFingerprintDuplicate: vi.fn(() => ({ duplicate: false })),
    initSubscription: mocks.initSubscription,
    canCreatePost: vi.fn(() => ({ allowed: true })),
    incrementPostCount: vi.fn(),
    canUploadVideo: vi.fn(() => ({ allowed: true })),
    getSubscriptionConfig: vi.fn(async () => ({ billingEnabled: false })),
}))

vi.mock("@/lib/slug", () => ({ generateUniqueSlug: vi.fn(async () => "uj-szalon") }))

vi.mock("@/lib/booking/booking-policy", () => ({
    canAcceptBookingRequest: vi.fn(() => ({ allowed: true })),
    canCancelMyBooking: vi.fn(() => ({ allowed: true })),
    canHandleBookingRequest: vi.fn(() => ({ allowed: true })),
    formatBookingDecisionMessage: vi.fn(() => ({ subject: "", content: "" })),
    formatBookingVisitorCancellationMessage: vi.fn(() => ({ subject: "", content: "" })),
    validateBookingRequestFields: vi.fn(() => ({ allowed: true })),
}))

import { createSalon } from "../../lib/actions/salon"

const OWNER_ID = "owner-1"

const ERVENYES_ADAT = {
    name: "Új Szalon",
    address: "Budapest, Fő utca 1",
    currency: "HUF",
    country: "Magyarország",
    city: "Budapest",
}

describe("createSalon publikálási állapota", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.requireSession.mockResolvedValue(OWNER_ID)
        mocks.prisma.salon.create.mockResolvedValue({
            id: "salon-uj",
            name: "Új Szalon",
            slug: "uj-szalon",
            city: "Budapest",
        })
        mocks.canPublishSalon.mockResolvedValue({ allowed: true })
    })

    it("1. fázisban azonnal publikáltan hozza létre a szalont", async () => {
        await createSalon(ERVENYES_ADAT)

        const createArg = mocks.prisma.salon.create.mock.calls[0][0]
        expect(createArg.data.isPublished).toBe(true)
        expect(createArg.data.publishedAt).toBeInstanceOf(Date)
    })

    it("a házirend elutasítása esetén publikálatlanul hozza létre", async () => {
        mocks.canPublishSalon.mockResolvedValue({ allowed: false, reason: "Kvóta betelt." })

        await createSalon(ERVENYES_ADAT)

        const createArg = mocks.prisma.salon.create.mock.calls[0][0]
        expect(createArg.data.isPublished).toBe(false)
        expect(createArg.data.publishedAt).toBeNull()
    })

    it("a szalon létrehozása akkor is sikerül, ha nem publikálható", async () => {
        mocks.canPublishSalon.mockResolvedValue({ allowed: false, reason: "Kvóta betelt." })

        await expect(createSalon(ERVENYES_ADAT)).resolves.toMatchObject({ id: "salon-uj" })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salon/salon-create-publishing.test.ts`
Expected: FAIL — a `create` hívás `data` objektumában nincs `isPublished` mező

- [ ] **Step 3: A `createSalon` módosítása**

A `lib/actions/salon.ts`-ben a `createSalon` törzsében, a `const slug = await generateUniqueSlug(salonName, prisma)` sor **után** szúrd be:

```ts
        // A publikálás a házirenden keresztül dől el. Az 1. fázisban ez mindig
        // engedélyez, tehát az új szalon azonnal publikált lesz. A létrehozás
        // maga sosem bukik el a publikálási házirenden.
        const publishPolicy = await canPublishSalon(data.ownerId ?? sessionUserId)
```

Majd a `prisma.salon.create({ data: { ... } })` hívásban a `slug,` sor után szúrd be:

```ts
                isPublished: publishPolicy.allowed,
                publishedAt: publishPolicy.allowed ? new Date() : null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/salon/salon-create-publishing.test.ts`
Expected: PASS — 3 teszt zöld

- [ ] **Step 5: A teljes tesztkészlet**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: minden teszt zöld, typecheck és lint hibamentes

- [ ] **Step 6: Commit**

```bash
git add lib/actions/salon.ts tests/salon/salon-create-publishing.test.ts
git commit -m "feat(salon): a createSalon a publikálási házirenden keresztül publikál

Az 1. fázisban a viselkedés változatlan (az új szalon azonnal publikált),
de a döntés már a házirenden megy át, így a 2. fázis nem igényli a
hívási hely módosítását. A létrehozás sosem bukik el a házirenden."
```

---

### Task 9: Publikálási állapot a felületen

**Files:**
- Create: `components/salon-console/salon-publish-toggle.tsx`
- Modify: `app/dashboard/salons/page.tsx` (`DashboardSalon` típus és a szalonkártya)
- Modify: `lib/actions/salon.ts` (`getUserSalons` select-je)
- Modify: `components/salon-console/salon-profile-content.tsx` (a kapcsoló beillesztése)

**Interfaces:**
- Consumes: `publishSalon()`, `unpublishSalon()` (Task 7), `Salon.isPublished`, `Salon.publishBlockedReason` (Task 1).
- Produces: `<SalonPublishToggle salonId isPublished publishBlockedReason onChanged />` React komponens.

- [ ] **Step 1: A `getUserSalons` ellenőrzése**

A `lib/actions/salon.ts`-ben a `getUserSalons` `include`-ot használ (`include: { subscription: { select: {...} } }`), nem `select`-et. A Prisma ilyenkor a `Salon` összes skalármezőjét visszaadja, tehát az `isPublished` és a `publishBlockedReason` már most is szerepel a válaszban.

Ez a lépés csak megerősítés: nyisd meg a függvényt és győződj meg róla, hogy `include` szerepel benne. Ha valaki időközben `select`-re írta át, egészítsd ki a `select` blokkot:

```ts
                isPublished: true,
                publishBlockedReason: true,
```

- [ ] **Step 2: A publikálási kapcsoló komponens**

Create `components/salon-console/salon-publish-toggle.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { publishSalon, unpublishSalon } from "@/lib/actions/salon"

type SalonPublishToggleProps = {
  salonId: string
  isPublished: boolean
  publishBlockedReason: string | null
  onChanged?: () => void
}

function blockedText(reason: string) {
  return reason === "BILLING"
    ? "A publikálás előfizetési okból le van tiltva."
    : "A publikálás adminisztrátori döntés miatt le van tiltva."
}

export function SalonPublishToggle({
  salonId,
  isPublished,
  publishBlockedReason,
  onChanged,
}: SalonPublishToggleProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isBlocked = publishBlockedReason !== null

  const handleClick = () => {
    setError(null)

    if (isPublished && !window.confirm(
      "Biztosan leveszed a szalont? Ezután nem jelenik meg a keresésben, és nem lehet hozzá időpontot kérni. Az adatok és a korábbi foglalások megmaradnak."
    )) {
      return
    }

    startTransition(async () => {
      const result = isPublished
        ? await unpublishSalon(salonId)
        : await publishSalon(salonId)

      if (!result.success) {
        setError("error" in result && result.error ? result.error : "A művelet nem sikerült.")
        return
      }
      onChanged?.()
    })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isPublished ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {isBlocked ? <Lock className="h-5 w-5" /> : isPublished ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">Publikálás</p>
            <p className="text-xs leading-5 text-text-secondary">
              {isBlocked
                ? blockedText(publishBlockedReason)
                : isPublished
                  ? "A szalon látható a látogatóknak."
                  : "A szalon jelenleg nem látható a látogatóknak."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleClick}
          disabled={pending || isBlocked}
          variant={isPublished ? "outline" : "default"}
          className="w-fit rounded-full font-bold"
        >
          {pending ? "Mentés..." : isPublished ? "Levétel" : "Publikálás"}
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: A kapcsoló beillesztése a szalonprofilba**

A `components/salon-console/salon-profile-content.tsx`-ben add hozzá az importot:

```tsx
import { SalonPublishToggle } from "@/components/salon-console/salon-publish-toggle"
```

Majd a `BasicInfoCard` fölé, a visszatérő JSX legkülső konténerének első gyerekeként illeszd be:

```tsx
      <SalonPublishToggle
        salonId={salonId}
        isPublished={salon.isPublished ?? false}
        publishBlockedReason={salon.publishBlockedReason ?? null}
        onChanged={() => window.location.reload()}
      />
```

- [ ] **Step 4: Státuszjelzés a szalonlistában**

Az `app/dashboard/salons/page.tsx`-ben bővítsd a `DashboardSalon` típust:

```ts
type DashboardSalon = Salon & {
    isPublished?: boolean
    publishBlockedReason?: string | null
    subscription?: {
        plan: "FREE" | "STANDARD" | "PREMIUM"
        status: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELLED"
        freeExpiresAt?: string | Date | null
        currentPeriodEnd?: string | Date | null
        cancelAtPeriodEnd?: boolean
    } | null
}
```

Majd a szalonkártyán belül, az értékelést mutató `<div className="absolute right-4 top-4 ...">` blokk **elé** szúrd be a bal felső sarokba kerülő státuszjelzőt:

```tsx
                                        <div className="absolute left-4 top-4">
                                            {salon.publishBlockedReason ? (
                                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 shadow-sm">
                                                    Tiltva
                                                </span>
                                            ) : salon.isPublished ? (
                                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 shadow-sm">
                                                    Publikálva
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600 shadow-sm">
                                                    Nem publikált
                                                </span>
                                            )}
                                        </div>
```

- [ ] **Step 5: Typecheck és lint**

Run: `npm run typecheck && npm run lint`
Expected: hibamentes

Ha a typecheck a `salon.isPublished` mezőre panaszkodik a `salon-profile-content.tsx`-ben, egészítsd ki a `Salon` típust a `lib/salon-types.ts`-ben az `isPublished?: boolean` és `publishBlockedReason?: string | null` opcionális mezőkkel.

- [ ] **Step 6: Kézi ellenőrzés a futó alkalmazásban**

Indítsd el a fejlesztői szervert, jelentkezz be `provider1@glowyspot.com` / `password123` fiókkal, és nyisd meg a `/dashboard/salons` oldalt.

Ellenőrizd:
1. Minden szalonkártyán megjelenik a zöld „Publikálva" jelölés.
2. Egy szalon megnyitása után a profil oldalon látszik a publikálási kapcsoló.
3. A „Levétel" gomb megerősítést kér, majd a kártya jelölése „Nem publikált"-ra vált.
4. Kijelentkezve a levett szalon nem jelenik meg a `/providers` oldalon, és a publikus profil URL-je „nem található" oldalt ad.
5. A „Publikálás" gombbal a szalon visszakerül a publikus felületre.

- [ ] **Step 7: Az eseménynapló ellenőrzése**

Jelentkezz be `admin@glowyspot.com` / `password123` fiókkal, és nyisd meg a `/dashboard/admin/audit-log` oldalt.

Expected: megjelenik a `SALON_UNPUBLISH` és a `SALON_PUBLISH` esemény a szolgáltató nevével és a szalon azonosítójával.

- [ ] **Step 8: A teljes tesztkészlet és build**

Run: `npm run test:run && npm run build`
Expected: minden teszt zöld, a build sikeres, a kimenetben megjelenik a `ƒ Proxy (Middleware)` sor

- [ ] **Step 9: Commit**

```bash
git add components/salon-console/salon-publish-toggle.tsx app/dashboard/salons/page.tsx components/salon-console/salon-profile-content.tsx lib/salon-types.ts lib/actions/salon.ts
git commit -m "feat(salon): publikálási kapcsoló és státuszjelzés a felületen

A szalonlistában minden szalon mellett látszik a publikálási állapot,
a szalonprofilban pedig kapcsolható. A levétel megerősítést kér, a
rendszer által tiltott szalonnál a kapcsoló letiltva, az okkal együtt."
```

---

### Task 10: Dokumentáció frissítése

**Files:**
- Modify: `README.md` (a „Szerepkörök és jogosultság" szakasz után)
- Modify: `docs/audits/2026-08-15-full-audit-report.md` (a 10. szakasz nyitott pontjai)

**Interfaces:**
- Consumes: minden korábbi task.
- Produces: nincs kód.

- [ ] **Step 1: A README bővítése**

A `README.md`-ben a „### Fiók inaktiválás" szakasz **után** szúrd be:

```markdown
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
```

- [ ] **Step 2: Az audit-riport nyitott pontjának lezárása**

A `docs/audits/2026-08-15-full-audit-report.md` 10. szakaszában cseréld le a `Salon.isActive` háromszoros túlterheléséről szóló sort:

```markdown
| `Salon.isActive` háromszoros túlterhelése | **Megoldva.** A publikálási állapot külön mezőkbe került, a lejáratás `publishBlockedReason`-t ír. Terv és megvalósítás: [`../superpowers/plans/2026-08-15-salon-publishing-state.md`](../superpowers/plans/2026-08-15-salon-publishing-state.md). | — |
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/audits/2026-08-15-full-audit-report.md
git commit -m "docs: szalon publikálási állapot dokumentálása

A README leírja a három jelző felelősségi körét és a közös láthatósági
szűrőt. Az audit-riport isActive túlterhelésről szóló nyitott pontja
lezárva."
```

---

## Nyitott pontok a terv után

Ezek **nem** részei ennek a tervnek, de a megvalósítás során felszínre kerültek és rögzítésre érdemesek:

| Terület | Megjegyzés |
| --- | --- |
| `sendMessage` további hiányzó ellenőrzései | A Task 4 hozzáadja a szalon láthatóságának ellenőrzését, de a `sendMessage` továbbra sem vizsgálja, hogy a címzett valóban a szalon tulajdonosa-e, sem az `allowMessages` beállítást. Ez a `codex` ág T-009 feladata volt, és a `main`-en hiányzik. Külön javítást igényel. |
| `canUseBooking` és `isPremium` holt kód | Sehonnan nincs meghívva a `lib/subscription.ts`-ből. Törlésre javasolt. |
| `story-bar.tsx` nem létező mezőt olvas | A `salon.subscriptionPlan` nincs a Prisma sémában, így a prémium jelölés soha nem jelenik meg. |
| C csomag | Kvóta-házirend, `SubscriptionConfig` admin felület, türelmi idő és értesítő emailek. |
| D csomag | Stripe-integráció. |
