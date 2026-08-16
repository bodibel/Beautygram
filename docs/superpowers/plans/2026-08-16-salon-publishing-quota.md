# Szalon publikálási kvóta és admin konfiguráció — megvalósítási terv

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `canPublishSalon()` házirend megkapja a valódi kvóta-logikát, és a három termékfázis adminból kapcsolhatóvá válik, fizetési szolgáltató nélkül.

**Architecture:** A `SubscriptionConfig` négy paraméterrel vezérli a fázisokat. A kvóta a `publishBlockedReason = "QUOTA"` értéket írja, soha nem az `isPublished`-et — így a tulajdonos szándéka érintetlen marad. A fizetési szolgáltató beillesztési pontja egyetlen függvény, a `hasActivePaidSubscription()`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 6 + PostgreSQL, Vitest, Tailwind CSS 4.

**Spec:** [`docs/superpowers/specs/2026-08-15-salon-publishing-quota-design.md`](../specs/2026-08-15-salon-publishing-quota-design.md)

## Global Constraints

- Minden felhasználónak szóló szöveg és minden komment magyar nyelvű.
- Behúzás: `lib/` alatt 4 szóköz, **kivéve** a `lib/subscription.ts`-t, ami 2 szóközt használ. A `components/` alatt 2 szóköz. A Prisma sémában 2 szóköz.
- Minden szerver action a meglévő guard-mintát használja: `requireSession()`, `requireAdminSession()` a `lib/auth-utils.ts`-ből.
- Minden állapotváltoztató művelet naplózandó a `writeAuditLog()` hívással, és minden új eseményazonosítót fel kell venni az `AUDIT_ACTIONS` konstansba (`lib/audit-log.ts`).
- A cron végpontok fail-closed `CRON_SECRET` ellenőrzést használnak: hiányzó titok esetén is 401.
- **Tilos `npm run dev`-et indítani.** Ellenőrzés: `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`.
- Prisma migráció készítése előtt a dev szervert le kell állítani, különben Windows alatt a `prisma generate` `EPERM` hibával elszáll.
- **Tilos bármilyen fizetési szolgáltató kódját vagy mezőjét bevezetni** (Stripe, Barion, SimplePay). A szolgáltató még nincs eldöntve.
- A `billingEnabled` alapértéke `false` marad a terv végén — ez az 1. fázis.
- A `publishBlockedReason` értékkészlete a terv után: `null | "BILLING" | "ADMIN" | "QUOTA"`.

---

### Task 1: Konfigurációs mezők és migráció

**Files:**
- Modify: `prisma/schema.prisma` (`SubscriptionConfig` modell)
- Modify: `lib/subscription.ts` (`DEFAULT_CONFIG`, `getSubscriptionConfig`)
- Create: `prisma/migrations/<timestamp>_add_publishing_quota_config/migration.sql` (a `prisma migrate dev` generálja)

**Interfaces:**
- Consumes: a meglévő `SubscriptionConfig.billingEnabled` mező.
- Produces: `SubscriptionConfig.billingEnabledAt: Date | null`, `.freeSalonSlots: number`, `.freeSlotTrialDays: number`, `.gracePeriodDays: number`. A `getSubscriptionConfig()` visszatérési objektuma mind a négy mezővel bővül.

- [ ] **Step 1: A dev szerver leállítása**

Ha fut a fejlesztői szerver, állítsd le. Windows alatt a futó szerver lefoglalja a Prisma query engine DLL-t, és a `prisma generate` `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` hibával elszáll.

- [ ] **Step 2: A séma bővítése**

A `prisma/schema.prisma`-ban a `SubscriptionConfig` modellben cseréld le ezt a részt:

```prisma
  // Fő kapcsoló. Amíg false, sem a lejáratás, sem a csomagkorlátok nem érvényesülnek.
  // 1. fázis (felfutás): false. 2. fázistól: true.
  billingEnabled Boolean @default(false)
```

erre:

```prisma
  // Fő kapcsoló. Amíg false, sem a lejáratás, sem a csomagkorlátok nem érvényesülnek.
  // 1. fázis (felfutás): false. 2. fázistól: true.
  billingEnabled Boolean @default(false)

  // Mikor kapcsolták be a számlázást. A türelmi idő ebből számolódik.
  // Írója KIZÁRÓLAG az admin konfigurációs action, a kapcsoló felfutó élén.
  billingEnabledAt DateTime?

  // Hány szalont publikálhat ingyen egy szolgáltató.
  freeSalonSlots Int @default(1)

  // Meddig tart az ingyenes hely, napokban. 0 = korlátlan ideig.
  // 2. fázis: 0. 3. fázis: a kívánt napszám.
  freeSlotTrialDays Int @default(0)

  // Türelmi idő a szabály szigorításakor, napokban.
  gracePeriodDays Int @default(30)
```

- [ ] **Step 3: Migráció generálása**

Run: `npx prisma migrate dev --name add_publishing_quota_config --skip-seed`
Expected: `Applying migration ...add_publishing_quota_config`, majd `Your database is now in sync with your schema.`

Ha a `prisma generate` `EPERM` hibával áll le, az nem baj — a migráció ettől már lefutott. A generálást a következő lépés pótolja.

- [ ] **Step 4: Prisma kliens generálása**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client (v6.19.2)`

- [ ] **Step 5: A `DEFAULT_CONFIG` bővítése**

A `lib/subscription.ts`-ben cseréld le a `DEFAULT_CONFIG` konstanst:

```ts
export const DEFAULT_CONFIG = {
  freeTrialDays: 60,       // 2 hónap
  freeMonthlyPostLimit: 5, // 5 poszt / 30 nap
  billingEnabled: false,   // 1. fázis: minden ingyenes, semmi nem jár le
  freeSalonSlots: 1,       // szolgáltatónként ennyi szalon publikálható ingyen
  freeSlotTrialDays: 0,    // 0 = az ingyenes hely nem jár le
  gracePeriodDays: 30,     // türelmi idő a szabály szigorításakor
}
```

- [ ] **Step 6: A `getSubscriptionConfig` bővítése**

A `lib/subscription.ts`-ben a `getSubscriptionConfig()` visszatérési objektumában a `billingEnabled` sor alá szúrd be:

```ts
    billingEnabledAt: config?.billingEnabledAt ?? null,
    freeSalonSlots: config?.freeSalonSlots ?? DEFAULT_CONFIG.freeSalonSlots,
    freeSlotTrialDays: config?.freeSlotTrialDays ?? DEFAULT_CONFIG.freeSlotTrialDays,
    gracePeriodDays: config?.gracePeriodDays ?? DEFAULT_CONFIG.gracePeriodDays,
```

- [ ] **Step 7: Ellenőrzés**

Run: `npm run typecheck && npm run lint && npm run test:run`
Expected: typecheck és lint hibamentes, minden meglévő teszt zöld

- [ ] **Step 8: Az adatbázis állapotának ellenőrzése**

```bash
docker exec glowyspot-db psql -U $(grep POSTGRES_USER .env | cut -d= -f2 | tr -d '\r') -d $(grep POSTGRES_DB .env | cut -d= -f2 | tr -d '\r') -c 'select "billingEnabled", "billingEnabledAt", "freeSalonSlots", "freeSlotTrialDays", "gracePeriodDays" from "SubscriptionConfig";'
```

Expected: egy sor, `billingEnabled = f`, `billingEnabledAt` üres, `freeSalonSlots = 1`, `freeSlotTrialDays = 0`, `gracePeriodDays = 30`

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/subscription.ts
git commit -m "feat(subscription): kvóta konfigurációs mezők

A SubscriptionConfig négy új mezővel vezérli a termékfázisokat:
billingEnabledAt (a türelmi idő kezdete), freeSalonSlots, freeSlotTrialDays
és gracePeriodDays. Alapértékek az 1. fázisnak megfelelően."
```

---

### Task 2: A kvóta-házirend

**Files:**
- Modify: `lib/salon-publishing.ts` (teljes átírás)
- Test: `tests/salon/salon-publishing.test.ts` (teljes átírás)

**Interfaces:**
- Consumes: `getSubscriptionConfig()` a `lib/subscription.ts`-ből, a Task 1 négy új mezőjével.
- Produces:
  - `canPublishSalon(ownerId: string, salonId?: string): Promise<PublishPolicyResult>` — a meglévő szignatúra változatlan.
  - `hasActivePaidSubscription(salonId: string): Promise<boolean>` — **a D csomag beillesztési pontja.**
  - `getSalonQuotaStatus(ownerId: string): Promise<QuotaStatus>` — a felület ezt jeleníti meg.
  - `type QuotaStatus = { billingEnabled: boolean; freeSlots: number; usedSlots: number; inGracePeriod: boolean; graceEndsAt: Date | null }`

- [ ] **Step 1: Write the failing test**

Cseréld le a `tests/salon/salon-publishing.test.ts` teljes tartalmát:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    getSubscriptionConfig: vi.fn(),
    prisma: {
        salon: {
            count: vi.fn(),
            findUnique: vi.fn(),
        },
        subscription: {
            findUnique: vi.fn(),
        },
    },
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("@/lib/subscription", () => ({ getSubscriptionConfig: mocks.getSubscriptionConfig }))

import { canPublishSalon, getSalonQuotaStatus, hasActivePaidSubscription } from "../../lib/salon-publishing"

const OWNER = "owner-1"
const SALON = "salon-1"

/** Alapértelmezett konfiguráció, amit az egyes tesztek felülírnak. */
function config(overrides: Record<string, unknown> = {}) {
    return {
        billingEnabled: true,
        billingEnabledAt: new Date("2026-01-01T00:00:00.000Z"),
        freeSalonSlots: 1,
        freeSlotTrialDays: 0,
        gracePeriodDays: 30,
        ...overrides,
    }
}

describe("hasActivePaidSubscription", () => {
    beforeEach(() => vi.clearAllMocks())

    it("igaz, ha fizetett és aktív az előfizetés", async () => {
        mocks.prisma.subscription.findUnique.mockResolvedValue({ plan: "STANDARD", status: "ACTIVE" })
        await expect(hasActivePaidSubscription(SALON)).resolves.toBe(true)
    })

    it.each([
        ["FREE csomag", { plan: "FREE", status: "ACTIVE" }],
        ["lejárt előfizetés", { plan: "STANDARD", status: "INACTIVE" }],
        ["nincs rekord", null],
    ])("hamis, ha %s", async (_leiras, sub) => {
        mocks.prisma.subscription.findUnique.mockResolvedValue(sub)
        await expect(hasActivePaidSubscription(SALON)).resolves.toBe(false)
    })
})

describe("canPublishSalon", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"))
        mocks.prisma.subscription.findUnique.mockResolvedValue(null)
        mocks.prisma.salon.count.mockResolvedValue(0)
        mocks.prisma.salon.findUnique.mockResolvedValue({ publishedAt: null })
    })

    it("1. fázisban mindig engedélyez, akkor is ha sok szalon van", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config({ billingEnabled: false }))
        mocks.prisma.salon.count.mockResolvedValue(25)

        await expect(canPublishSalon(OWNER)).resolves.toEqual({ allowed: true })
        expect(mocks.prisma.salon.count).not.toHaveBeenCalled()
    })

    it("türelmi időn belül engedélyez, akkor is ha betelt a keret", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(
            config({ billingEnabledAt: new Date("2026-05-20T00:00:00.000Z"), gracePeriodDays: 30 })
        )
        mocks.prisma.salon.count.mockResolvedValue(5)

        await expect(canPublishSalon(OWNER)).resolves.toEqual({ allowed: true })
    })

    it("engedélyez, ha a keret még nem telt be", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.count.mockResolvedValue(0)

        await expect(canPublishSalon(OWNER, SALON)).resolves.toEqual({ allowed: true })
    })

    it("elutasít, ha betelt a keret", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.count.mockResolvedValue(1)

        const result = await canPublishSalon(OWNER, SALON)
        expect(result.allowed).toBe(false)
        expect(result.reason).toContain("1")
    })

    it("fizetett szalont a keret felett is engedélyez", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.count.mockResolvedValue(5)
        mocks.prisma.subscription.findUnique.mockResolvedValue({ plan: "PREMIUM", status: "ACTIVE" })

        await expect(canPublishSalon(OWNER, SALON)).resolves.toEqual({ allowed: true })
    })

    it("elutasít, ha az ingyenes hely lejárt", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config({ freeSlotTrialDays: 30 }))
        mocks.prisma.salon.count.mockResolvedValue(0)
        mocks.prisma.salon.findUnique.mockResolvedValue({ publishedAt: new Date("2026-01-01T00:00:00.000Z") })

        const result = await canPublishSalon(OWNER, SALON)
        expect(result.allowed).toBe(false)
        expect(result.reason).toContain("ingyenes")
    })

    it("engedélyez, ha az ingyenes hely még nem járt le", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config({ freeSlotTrialDays: 30 }))
        mocks.prisma.salon.count.mockResolvedValue(0)
        mocks.prisma.salon.findUnique.mockResolvedValue({ publishedAt: new Date("2026-05-25T00:00:00.000Z") })

        await expect(canPublishSalon(OWNER, SALON)).resolves.toEqual({ allowed: true })
    })

    it("konfigurációs hiba esetén megengedő", async () => {
        mocks.getSubscriptionConfig.mockRejectedValue(new Error("adatbázis hiba"))

        await expect(canPublishSalon(OWNER, SALON)).resolves.toEqual({ allowed: true })
    })
})

describe("getSalonQuotaStatus", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"))
        mocks.prisma.salon.count.mockResolvedValue(2)
    })

    it("1. fázisban jelzi, hogy nincs korlátozás", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config({ billingEnabled: false }))

        const status = await getSalonQuotaStatus(OWNER)
        expect(status.billingEnabled).toBe(false)
        expect(status.inGracePeriod).toBe(false)
    })

    it("türelmi idő alatt megadja a lejárat időpontját", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(
            config({ billingEnabledAt: new Date("2026-05-20T00:00:00.000Z"), gracePeriodDays: 30 })
        )

        const status = await getSalonQuotaStatus(OWNER)
        expect(status.inGracePeriod).toBe(true)
        expect(status.graceEndsAt).toEqual(new Date("2026-06-19T00:00:00.000Z"))
        expect(status.freeSlots).toBe(1)
        expect(status.usedSlots).toBe(2)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salon/salon-publishing.test.ts`
Expected: FAIL — `hasActivePaidSubscription is not a function`

- [ ] **Step 3: Write the implementation**

Cseréld le a `lib/salon-publishing.ts` teljes tartalmát:

```ts
import prisma from "@/lib/db"
import { getSubscriptionConfig } from "@/lib/subscription"

/**
 * A publikálási házirend — a fizetős fázisok vezérlője.
 *
 * A termék három fázisa a SubscriptionConfig négy mezőjével kapcsolható:
 *   billingEnabled     — amíg false, minden szalon ingyenesen publikálható (1. fázis)
 *   freeSalonSlots     — szolgáltatónként ennyi szalon publikálható ingyen
 *   freeSlotTrialDays  — meddig tart az ingyenes hely (0 = korlátlan ideig)
 *   gracePeriodDays    — türelmi idő a szabály szigorításakor
 */

export type PublishPolicyResult = {
    allowed: boolean
    reason?: string
}

export type QuotaStatus = {
    billingEnabled: boolean
    freeSlots: number
    usedSlots: number
    inGracePeriod: boolean
    graceEndsAt: Date | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Van-e a szalonnak érvényes fizetett előfizetése?
 *
 * EZ A FIZETÉSI SZOLGÁLTATÓ BEILLESZTÉSI PONTJA. Jelenleg csak a Subscription
 * rekord plan/status mezőiből dönt, tehát fizetési folyamat híján gyakorlatilag
 * mindig hamis. Amikor a fizetés bekerül, elég ezt az egy függvényt átírni —
 * a házirend és minden hívási hely változatlan marad.
 */
export async function hasActivePaidSubscription(salonId: string): Promise<boolean> {
    const sub = await prisma.subscription.findUnique({
        where: { salonId },
        select: { plan: true, status: true },
    })
    return Boolean(sub && sub.plan !== "FREE" && sub.status === "ACTIVE")
}

/** Mikor jár le a türelmi idő? `null`, ha nincs folyamatban. */
function graceEnd(config: { billingEnabledAt: Date | null; gracePeriodDays: number }): Date | null {
    if (!config.billingEnabledAt) return null
    return new Date(config.billingEnabledAt.getTime() + config.gracePeriodDays * MS_PER_DAY)
}

/**
 * Hány ingyenes helyet foglal el jelenleg a szolgáltató?
 * A fizetett szalonok nem számítanak bele, mert nem az ingyenes keretet fogyasztják.
 */
async function countFreePublishedSalons(ownerId: string, excludeSalonId?: string): Promise<number> {
    return prisma.salon.count({
        where: {
            ownerId,
            isPublished: true,
            publishBlockedReason: null,
            ...(excludeSalonId ? { id: { not: excludeSalonId } } : {}),
            // A `subscription` egy-az-egyhez kapcsolat, ezért a hiányát az
            // `is: null` alakkal kell szűrni, nem `subscription: null`-lal.
            OR: [
                { subscription: { is: null } },
                { subscription: { plan: "FREE" } },
                { subscription: { status: { not: "ACTIVE" } } },
            ],
        },
    })
}

/**
 * Publikálhatja-e a megadott tulajdonos a szalonját?
 *
 * @param ownerId A szalon tulajdonosának azonosítója.
 * @param salonId A publikálandó szalon azonosítója. Újonnan létrehozott szalonnál
 *   elhagyható. Megadva a szalon nem számít bele a saját kvóta-ellenőrzésébe,
 *   így az újrapublikálás nem foglal új helyet.
 */
export async function canPublishSalon(
    ownerId: string,
    salonId?: string
): Promise<PublishPolicyResult> {
    let config
    try {
        config = await getSubscriptionConfig()
    } catch (error) {
        // Megengedő alapértelmezés: egy konfigurációs hiba miatt fizetőfal mögé
        // zárni az ügyfeleket rosszabb kimenet, mint átmenetileg többet engedni.
        console.error("Publikálási házirend: a konfiguráció nem olvasható:", error)
        return { allowed: true }
    }

    // 1. fázis: minden szalon ingyenesen publikálható.
    if (!config.billingEnabled) {
        return { allowed: true }
    }

    // Türelmi idő: a szabály szigorítása után mindenki kap időt a rendezésre.
    const graceEndsAt = graceEnd(config)
    if (graceEndsAt && Date.now() < graceEndsAt.getTime()) {
        return { allowed: true }
    }

    // Fizetett szalon mindig publikálható, a keret nem vonatkozik rá.
    if (salonId && await hasActivePaidSubscription(salonId)) {
        return { allowed: true }
    }

    const usedSlots = await countFreePublishedSalons(ownerId, salonId)
    if (usedSlots >= config.freeSalonSlots) {
        return {
            allowed: false,
            reason: `Elérted az ingyenesen publikálható szalonok számát (${config.freeSalonSlots}). `
                + "A további szalonok publikálásához előbb vegyél le egy másikat.",
        }
    }

    // 3. fázis: az ingyenes hely is lejárhat.
    if (config.freeSlotTrialDays > 0 && salonId) {
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { publishedAt: true },
        })
        if (salon?.publishedAt) {
            const ageInDays = (Date.now() - salon.publishedAt.getTime()) / MS_PER_DAY
            if (ageInDays > config.freeSlotTrialDays) {
                return {
                    allowed: false,
                    reason: `Az ingyenes publikálási időszak (${config.freeSlotTrialDays} nap) lejárt ennél a szalonnál.`,
                }
            }
        }
    }

    return { allowed: true }
}

/**
 * A szolgáltató kvóta-állapota a felület számára.
 * Hiba esetén dob — a hívó felület ilyenkor elrejti a jelzést,
 * hogy soha ne mutasson pontatlan keretet.
 */
export async function getSalonQuotaStatus(ownerId: string): Promise<QuotaStatus> {
    const config = await getSubscriptionConfig()
    const graceEndsAt = graceEnd(config)
    const inGracePeriod = Boolean(
        config.billingEnabled && graceEndsAt && Date.now() < graceEndsAt.getTime()
    )

    return {
        billingEnabled: config.billingEnabled,
        freeSlots: config.freeSalonSlots,
        usedSlots: await countFreePublishedSalons(ownerId),
        inGracePeriod,
        graceEndsAt: config.billingEnabled ? graceEndsAt : null,
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/salon/salon-publishing.test.ts`
Expected: PASS — 13 teszt zöld

- [ ] **Step 5: Mutációs próba — bizonyítsd, hogy a tesztek mérnek**

A projektben korábban kétszer fordult elő, hogy egy teszt rossz okból ment át. Zárd ki ezt:

1. Kommentezd ki ideiglenesen a `canPublishSalon`-ban a `usedSlots >= config.freeSalonSlots` ág `return` blokkját (a függvény így mindig engedélyezne).
2. Run: `npx vitest run tests/salon/salon-publishing.test.ts`
   Expected: az "elutasít, ha betelt a keret" tesztnek **buknia kell**.
3. Állítsd vissza, majd kommentezd ki a türelmi idő ellenőrzését.
4. Run: ugyanaz. Expected: a "türelmi időn belül engedélyez" tesztnek **buknia kell**.
5. Állítsd vissza mindkettőt, futtasd újra — minden zöld.

Mindhárom futás tényleges kimenetét írd a jelentésbe. A végén a `git diff lib/salon-publishing.ts` csak a szándékolt új kódot mutassa.

- [ ] **Step 6: Teljes ellenőrzés**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: minden zöld

- [ ] **Step 7: Commit**

```bash
git add lib/salon-publishing.ts tests/salon/salon-publishing.test.ts
git commit -m "feat(salon): a publikálási házirend valódi kvóta-logikája

A canPublishSalon sorrendben vizsgálja: ki van-e kapcsolva a számlázás,
türelmi időn belül vagyunk-e, van-e a szalonnak fizetett előfizetése,
és belefér-e az ingyenes keretbe.

A hasActivePaidSubscription a fizetési szolgáltató beillesztési pontja:
amikor a fizetés bekerül, elég ezt az egy függvényt átírni.

Konfigurációs hiba esetén a házirend megengedő — fizetőfal mögé zárni az
ügyfeleket egy adatbázis-hiba miatt rosszabb kimenet."
```

---

### Task 3: Admin konfigurációs action-ök

**Files:**
- Modify: `lib/audit-log.ts` (`AUDIT_ACTIONS` bővítése)
- Create: `lib/actions/subscription-config.ts`
- Test: `tests/admin/subscription-config.test.ts`

**Interfaces:**
- Consumes: `requireAdminSession()` a `lib/auth-utils.ts`-ből (visszatérési értéke `ActiveSessionUser`, aminek van `id` mezője), `writeAuditLog()` és `getAuditActionContext()` a `lib/audit-log.ts`-ből.
- Produces:
  - `getSubscriptionConfigAdmin(): Promise<{ success: boolean; config?: BillingConfigView; error?: string }>`
  - `updateSubscriptionConfig(data: BillingConfigInput): Promise<{ success: boolean; error?: string }>`
  - `type BillingConfigInput = { billingEnabled?: boolean; freeSalonSlots?: number; freeSlotTrialDays?: number; gracePeriodDays?: number }`
  - `type BillingConfigView = { billingEnabled: boolean; billingEnabledAt: Date | null; freeSalonSlots: number; freeSlotTrialDays: number; gracePeriodDays: number }`
  - Új `AUDIT_ACTIONS` kulcsok: `ADMIN_BILLING_CONFIG_UPDATE`, `SALON_QUOTA_BLOCKED` (utóbbit a Task 4 használja).

- [ ] **Step 1: Naplózási események felvétele**

A `lib/audit-log.ts`-ben az `AUDIT_ACTIONS` objektumban az `ADMIN_CATEGORY_DELETE` sor alá szúrd be:

```ts
    ADMIN_BILLING_CONFIG_UPDATE: "ADMIN_BILLING_CONFIG_UPDATE",
```

A `SALON_BILLING_BLOCKED` sor alá szúrd be:

```ts
    SALON_QUOTA_BLOCKED: "SALON_QUOTA_BLOCKED",
```

- [ ] **Step 2: Write the failing test**

Create `tests/admin/subscription-config.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireAdminSession: vi.fn(),
    requireSession: vi.fn(),
    writeAuditLog: vi.fn(),
    revalidatePath: vi.fn(),
    prisma: {
        subscriptionConfig: {
            findFirst: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
        },
    },
}))

vi.mock("@/lib/auth-utils", () => ({
    requireAdminSession: mocks.requireAdminSession,
    requireSession: mocks.requireSession,
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_t, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

import { updateSubscriptionConfig } from "../../lib/actions/subscription-config"

const ADMIN = { id: "admin-1", role: "admin", name: null, email: null, image: null }
const LETEZO = {
    id: "config-1",
    billingEnabled: false,
    billingEnabledAt: null,
    freeSalonSlots: 1,
    freeSlotTrialDays: 0,
    gracePeriodDays: 30,
}

describe("updateSubscriptionConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"))
        mocks.requireAdminSession.mockResolvedValue(ADMIN)
        mocks.prisma.subscriptionConfig.findFirst.mockResolvedValue(LETEZO)
        mocks.prisma.subscriptionConfig.update.mockResolvedValue(LETEZO)
    })

    it("nem admin nem módosíthatja", async () => {
        mocks.requireAdminSession.mockRejectedValue(new Error("Unauthorized"))

        await expect(updateSubscriptionConfig({ billingEnabled: true })).rejects.toThrow()
        expect(mocks.prisma.subscriptionConfig.update).not.toHaveBeenCalled()
    })

    it("a billingEnabled bekapcsolásakor beállítja a billingEnabledAt-et", async () => {
        await updateSubscriptionConfig({ billingEnabled: true })

        const data = mocks.prisma.subscriptionConfig.update.mock.calls[0][0].data
        expect(data.billingEnabled).toBe(true)
        expect(data.billingEnabledAt).toEqual(new Date("2026-06-01T00:00:00.000Z"))
    })

    it("kikapcsoláskor nullázza a billingEnabledAt-et", async () => {
        mocks.prisma.subscriptionConfig.findFirst.mockResolvedValue({
            ...LETEZO,
            billingEnabled: true,
            billingEnabledAt: new Date("2026-05-01T00:00:00.000Z"),
        })

        await updateSubscriptionConfig({ billingEnabled: false })

        const data = mocks.prisma.subscriptionConfig.update.mock.calls[0][0].data
        expect(data.billingEnabled).toBe(false)
        expect(data.billingEnabledAt).toBeNull()
    })

    it("már bekapcsolt állapotban nem indít új türelmi időt", async () => {
        const eredeti = new Date("2026-05-01T00:00:00.000Z")
        mocks.prisma.subscriptionConfig.findFirst.mockResolvedValue({
            ...LETEZO,
            billingEnabled: true,
            billingEnabledAt: eredeti,
        })

        await updateSubscriptionConfig({ freeSalonSlots: 2 })

        const data = mocks.prisma.subscriptionConfig.update.mock.calls[0][0].data
        expect(data).not.toHaveProperty("billingEnabledAt")
    })

    it.each([
        ["freeSalonSlots", { freeSalonSlots: -1 }],
        ["freeSlotTrialDays", { freeSlotTrialDays: -5 }],
        ["gracePeriodDays", { gracePeriodDays: -30 }],
    ])("elutasítja a negatív %s értéket", async (_leiras, input) => {
        const result = await updateSubscriptionConfig(input)

        expect(result.success).toBe(false)
        expect(mocks.prisma.subscriptionConfig.update).not.toHaveBeenCalled()
    })

    it("naplózza a változtatást a régi és az új értékkel", async () => {
        await updateSubscriptionConfig({ freeSalonSlots: 3 })

        expect(mocks.writeAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "ADMIN_BILLING_CONFIG_UPDATE",
                userId: ADMIN.id,
            })
        )
        const metadata = mocks.writeAuditLog.mock.calls[0][0].metadata
        expect(metadata).toMatchObject({ elozo: expect.anything(), uj: expect.anything() })
    })

    it("létrehozza a konfigurációt, ha még nem létezik", async () => {
        mocks.prisma.subscriptionConfig.findFirst.mockResolvedValue(null)
        mocks.prisma.subscriptionConfig.create.mockResolvedValue(LETEZO)

        await updateSubscriptionConfig({ freeSalonSlots: 2 })

        expect(mocks.prisma.subscriptionConfig.create).toHaveBeenCalled()
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/admin/subscription-config.test.ts`
Expected: FAIL — `Cannot find module '../../lib/actions/subscription-config'`

- [ ] **Step 4: Write the implementation**

Create `lib/actions/subscription-config.ts`:

```ts
"use server"

import { revalidatePath } from "next/cache"

import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import { requireAdminSession } from "@/lib/auth-utils"
import prisma from "@/lib/db"

export type BillingConfigInput = {
    billingEnabled?: boolean
    freeSalonSlots?: number
    freeSlotTrialDays?: number
    gracePeriodDays?: number
}

export type BillingConfigView = {
    billingEnabled: boolean
    billingEnabledAt: Date | null
    freeSalonSlots: number
    freeSlotTrialDays: number
    gracePeriodDays: number
}

const NUMERIKUS_MEZOK = ["freeSalonSlots", "freeSlotTrialDays", "gracePeriodDays"] as const

/** A számlázási konfiguráció olvasása az admin felület számára. */
export async function getSubscriptionConfigAdmin(): Promise<{
    success: boolean
    config?: BillingConfigView
    error?: string
}> {
    await requireAdminSession()

    try {
        const config = await prisma.subscriptionConfig.findFirst({
            orderBy: { updatedAt: "desc" },
            select: {
                billingEnabled: true,
                billingEnabledAt: true,
                freeSalonSlots: true,
                freeSlotTrialDays: true,
                gracePeriodDays: true,
            },
        })

        return {
            success: true,
            config: config ?? {
                billingEnabled: false,
                billingEnabledAt: null,
                freeSalonSlots: 1,
                freeSlotTrialDays: 0,
                gracePeriodDays: 30,
            },
        }
    } catch (error) {
        console.error("Számlázási konfiguráció olvasási hiba:", error)
        return { success: false, error: "Nem sikerült a beállítások betöltése." }
    }
}

/**
 * A számlázási konfiguráció módosítása.
 *
 * A billingEnabled felfutó élén beállítja a billingEnabledAt értékét — ebből
 * számolódik a türelmi idő. Kikapcsoláskor nullázza, hogy egy későbbi
 * visszakapcsolás új türelmi időt indítson.
 */
export async function updateSubscriptionConfig(
    data: BillingConfigInput
): Promise<{ success: boolean; error?: string }> {
    const admin = await requireAdminSession()

    for (const mezo of NUMERIKUS_MEZOK) {
        const ertek = data[mezo]
        if (ertek !== undefined && (!Number.isInteger(ertek) || ertek < 0)) {
            return { success: false, error: "A számértékek csak nem negatív egész számok lehetnek." }
        }
    }

    try {
        const existing = await prisma.subscriptionConfig.findFirst({
            orderBy: { updatedAt: "desc" },
        })

        const updateData: Record<string, unknown> = { ...data }

        // A türelmi idő kezdete csak a kapcsoló állapotváltásakor íródik.
        // Ha már bekapcsolt állapotban módosítanak más mezőt, a billingEnabledAt
        // érintetlen marad — különben a türelmi idő minden mentéssel újraindulna.
        let turelmiIdoValtozott = false
        if (data.billingEnabled === true && !existing?.billingEnabled) {
            updateData.billingEnabledAt = new Date()
            turelmiIdoValtozott = true
        } else if (data.billingEnabled === false && existing?.billingEnabled) {
            updateData.billingEnabledAt = null
            turelmiIdoValtozott = true
        }

        if (existing) {
            await prisma.subscriptionConfig.update({
                where: { id: existing.id },
                data: { ...updateData, updatedBy: admin.id },
            })
        } else {
            await prisma.subscriptionConfig.create({
                data: { ...updateData, updatedBy: admin.id },
            })
        }

        await writeAuditLog({
            action: AUDIT_ACTIONS.ADMIN_BILLING_CONFIG_UPDATE,
            userId: admin.id,
            entity: "SubscriptionConfig",
            entityId: existing?.id ?? null,
            metadata: {
                elozo: {
                    billingEnabled: existing?.billingEnabled ?? null,
                    freeSalonSlots: existing?.freeSalonSlots ?? null,
                    freeSlotTrialDays: existing?.freeSlotTrialDays ?? null,
                    gracePeriodDays: existing?.gracePeriodDays ?? null,
                },
                // A metaadat csak JSON-biztos primitíveket tartalmazhat, ezért a
                // beküldött mezőket kifejezetten soroljuk fel, nem az update-objektumot
                // adjuk át (abban Date is lehet, amit a Prisma.InputJsonValue nem fogad el).
                uj: {
                    billingEnabled: data.billingEnabled ?? null,
                    freeSalonSlots: data.freeSalonSlots ?? null,
                    freeSlotTrialDays: data.freeSlotTrialDays ?? null,
                    gracePeriodDays: data.gracePeriodDays ?? null,
                },
                turelmiIdoUjraindult: turelmiIdoValtozott,
            },
            ...(await getAuditActionContext()),
        })

        revalidatePath("/dashboard/admin/settings")
        revalidatePath("/dashboard/salons")
        return { success: true }
    } catch (error) {
        console.error("Számlázási konfiguráció mentési hiba:", error)
        return { success: false, error: "Nem sikerült a beállítások mentése." }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/admin/subscription-config.test.ts`
Expected: PASS — 9 teszt zöld

- [ ] **Step 6: Mutációs próba**

1. Kommentezd ki ideiglenesen a `requireAdminSession()` hívást a `updateSubscriptionConfig`-ban (helyette `const admin = { id: "x" }`).
2. Run: `npx vitest run tests/admin/subscription-config.test.ts`
   Expected: a "nem admin nem módosíthatja" tesztnek **buknia kell**.
3. Állítsd vissza, futtasd újra — zöld.

Mindkét futás tényleges kimenetét írd a jelentésbe. A végén a `git diff lib/actions/subscription-config.ts` csak a szándékolt kódot mutassa.

- [ ] **Step 7: Teljes ellenőrzés és commit**

Run: `npm run test:run && npm run typecheck && npm run lint`

```bash
git add lib/actions/subscription-config.ts lib/audit-log.ts tests/admin/subscription-config.test.ts
git commit -m "feat(admin): számlázási konfiguráció szerver action-ök

Az admin olvashatja és módosíthatja a fázisokat vezérlő négy beállítást.
A billingEnabled felfutó élén beáll a billingEnabledAt, amiből a türelmi
idő számolódik; kikapcsoláskor nullázódik, hogy egy visszakapcsolás új
türelmi időt indítson. Minden változtatás naplózásra kerül a régi és az
új értékkel."
```

---

### Task 4: Kvóta-érvényesítő cron

**Files:**
- Create: `app/api/cron/enforce-publishing-quota/route.ts`
- Create: `lib/quota-enforcement.ts`
- Test: `tests/salon/quota-enforcement.test.ts`

**Interfaces:**
- Consumes: `getSubscriptionConfig()` a `lib/subscription.ts`-ből, `AUDIT_ACTIONS.SALON_QUOTA_BLOCKED` (Task 3).
- Produces: `enforcePublishingQuota(): Promise<number>` — a letiltott szalonok számával tér vissza.

- [ ] **Step 1: Write the failing test**

Create `tests/salon/quota-enforcement.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    getSubscriptionConfig: vi.fn(),
    writeAuditLog: vi.fn(),
    prisma: {
        salon: {
            findMany: vi.fn(),
            updateMany: vi.fn(),
        },
    },
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("@/lib/subscription", () => ({ getSubscriptionConfig: mocks.getSubscriptionConfig }))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_t, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

import { enforcePublishingQuota } from "../../lib/quota-enforcement"

/** Publikált szalon a lekérdezés alakjában. */
function salon(id: string, ownerId: string, publishedAt: string, paid = false) {
    return {
        id,
        ownerId,
        publishedAt: new Date(publishedAt),
        subscription: paid ? { plan: "STANDARD", status: "ACTIVE" } : { plan: "FREE", status: "ACTIVE" },
    }
}

function config(overrides: Record<string, unknown> = {}) {
    return {
        billingEnabled: true,
        billingEnabledAt: new Date("2026-01-01T00:00:00.000Z"),
        freeSalonSlots: 1,
        freeSlotTrialDays: 0,
        gracePeriodDays: 30,
        ...overrides,
    }
}

describe("enforcePublishingQuota", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"))
        mocks.prisma.salon.findMany.mockResolvedValue([])
        mocks.prisma.salon.updateMany.mockResolvedValue({ count: 0 })
    })

    it("kikapcsolt számlázásnál nem módosít semmit", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config({ billingEnabled: false }))

        await expect(enforcePublishingQuota()).resolves.toBe(0)
        expect(mocks.prisma.salon.findMany).not.toHaveBeenCalled()
        expect(mocks.prisma.salon.updateMany).not.toHaveBeenCalled()
    })

    it("türelmi időn belül nem módosít semmit", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(
            config({ billingEnabledAt: new Date("2026-05-20T00:00:00.000Z") })
        )

        await expect(enforcePublishingQuota()).resolves.toBe(0)
        expect(mocks.prisma.salon.updateMany).not.toHaveBeenCalled()
    })

    it("a legrégebben publikált marad, a többi QUOTA tiltást kap", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("regi", "owner-1", "2026-01-10T00:00:00.000Z"),
            salon("kozepso", "owner-1", "2026-02-10T00:00:00.000Z"),
            salon("uj", "owner-1", "2026-03-10T00:00:00.000Z"),
        ])
        mocks.prisma.salon.updateMany.mockResolvedValue({ count: 2 })

        await expect(enforcePublishingQuota()).resolves.toBe(2)

        const call = mocks.prisma.salon.updateMany.mock.calls[0][0]
        expect(call.where.id.in.sort()).toEqual(["kozepso", "uj"])
        expect(call.data).toMatchObject({ publishBlockedReason: "QUOTA" })
    })

    it("nem írja az isPublished mezőt", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("a", "owner-1", "2026-01-10T00:00:00.000Z"),
            salon("b", "owner-1", "2026-02-10T00:00:00.000Z"),
        ])

        await enforcePublishingQuota()

        const data = mocks.prisma.salon.updateMany.mock.calls[0][0].data
        expect(data).not.toHaveProperty("isPublished")
        expect(data).not.toHaveProperty("isActive")
    })

    it("a fizetett szalon mentesül és nem fogyasztja az ingyenes keretet", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("fizetett", "owner-1", "2026-01-10T00:00:00.000Z", true),
            salon("ingyenes", "owner-1", "2026-02-10T00:00:00.000Z"),
        ])

        await expect(enforcePublishingQuota()).resolves.toBe(0)
        expect(mocks.prisma.salon.updateMany).not.toHaveBeenCalled()
    })

    it("szolgáltatónként külön számol", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("a1", "owner-1", "2026-01-10T00:00:00.000Z"),
            salon("a2", "owner-1", "2026-02-10T00:00:00.000Z"),
            salon("b1", "owner-2", "2026-01-15T00:00:00.000Z"),
        ])
        mocks.prisma.salon.updateMany.mockResolvedValue({ count: 1 })

        await enforcePublishingQuota()

        expect(mocks.prisma.salon.updateMany.mock.calls[0][0].where.id.in).toEqual(["a2"])
    })

    it("lejárt ingyenes helyet is tilt", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config({ freeSlotTrialDays: 30 }))
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("regi", "owner-1", "2026-01-10T00:00:00.000Z"),
        ])
        mocks.prisma.salon.updateMany.mockResolvedValue({ count: 1 })

        await expect(enforcePublishingQuota()).resolves.toBe(1)
        expect(mocks.prisma.salon.updateMany.mock.calls[0][0].where.id.in).toEqual(["regi"])
    })

    it("naplózza a tiltott szalonokat", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("a", "owner-1", "2026-01-10T00:00:00.000Z"),
            salon("b", "owner-1", "2026-02-10T00:00:00.000Z"),
        ])

        await enforcePublishingQuota()

        expect(mocks.writeAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({ action: "SALON_QUOTA_BLOCKED", entityId: "b" })
        )
    })

    it("idempotens: ha nincs keret feletti szalon, nem módosít", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue(config())
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("egyetlen", "owner-1", "2026-01-10T00:00:00.000Z"),
        ])

        await expect(enforcePublishingQuota()).resolves.toBe(0)
        expect(mocks.prisma.salon.updateMany).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salon/quota-enforcement.test.ts`
Expected: FAIL — `Cannot find module '../../lib/quota-enforcement'`

- [ ] **Step 3: Write the implementation**

Create `lib/quota-enforcement.ts`:

```ts
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit-log"
import prisma from "@/lib/db"
import { getSubscriptionConfig } from "@/lib/subscription"

const MS_PER_DAY = 24 * 60 * 60 * 1000

type PublishedSalon = {
    id: string
    ownerId: string
    publishedAt: Date | null
    subscription: { plan: string; status: string } | null
}

/** Fizetett szalon: mentesül a kvóta alól, és nem fogyasztja az ingyenes keretet. */
function isPaid(salon: PublishedSalon): boolean {
    return Boolean(
        salon.subscription
        && salon.subscription.plan !== "FREE"
        && salon.subscription.status === "ACTIVE"
    )
}

/**
 * Kvóta-érvényesítés: a keret feletti szalonokra publikálási tiltást ír.
 *
 * A tiltás a publishBlockedReason mezőbe kerül, SOHA nem az isPublished-be:
 * az a tulajdonos szándékának mezője, és annak pontosan egy írója van. Így a
 * szolgáltató látja, hogy nem ő vette le a szalont, és ha később fizet, a
 * szándéka érintetlenül visszaáll.
 *
 * Visszatér: a most letiltott szalonok száma.
 */
export async function enforcePublishingQuota(): Promise<number> {
    const config = await getSubscriptionConfig()

    // 1. fázis: nincs kvóta.
    if (!config.billingEnabled) return 0

    // Türelmi idő alatt még senkit nem tiltunk.
    if (config.billingEnabledAt) {
        const graceEndsAt = config.billingEnabledAt.getTime() + config.gracePeriodDays * MS_PER_DAY
        if (Date.now() < graceEndsAt) return 0
    }

    const published: PublishedSalon[] = await prisma.salon.findMany({
        where: { isPublished: true, publishBlockedReason: null },
        select: {
            id: true,
            ownerId: true,
            publishedAt: true,
            subscription: { select: { plan: true, status: true } },
        },
        orderBy: { publishedAt: "asc" },
    })

    const byOwner = new Map<string, PublishedSalon[]>()
    for (const salon of published) {
        const list = byOwner.get(salon.ownerId) ?? []
        list.push(salon)
        byOwner.set(salon.ownerId, list)
    }

    const toBlock: string[] = []
    const now = Date.now()

    for (const salons of byOwner.values()) {
        let freeSlotsUsed = 0

        for (const salon of salons) {
            // Fizetett szalon mindig marad, és nem fogyasztja a keretet.
            if (isPaid(salon)) continue

            if (freeSlotsUsed >= config.freeSalonSlots) {
                toBlock.push(salon.id)
                continue
            }

            // 3. fázis: az ingyenes hely is lejárhat.
            if (config.freeSlotTrialDays > 0 && salon.publishedAt) {
                const ageInDays = (now - salon.publishedAt.getTime()) / MS_PER_DAY
                if (ageInDays > config.freeSlotTrialDays) {
                    toBlock.push(salon.id)
                    continue
                }
            }

            freeSlotsUsed += 1
        }
    }

    if (toBlock.length === 0) return 0

    await prisma.salon.updateMany({
        where: { id: { in: toBlock } },
        data: { publishBlockedReason: "QUOTA", publishBlockedAt: new Date() },
    })

    // Szalononként külön bejegyzés, hogy az admin nézetben entityId szerint
    // vissza lehessen keresni, mikor és miért tiltódott egy konkrét szalon.
    for (const salonId of toBlock) {
        await writeAuditLog({
            action: AUDIT_ACTIONS.SALON_QUOTA_BLOCKED,
            entity: "Salon",
            entityId: salonId,
            metadata: { freeSalonSlots: config.freeSalonSlots },
        })
    }

    return toBlock.length
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/salon/quota-enforcement.test.ts`
Expected: PASS — 9 teszt zöld

- [ ] **Step 5: A cron végpont**

Create `app/api/cron/enforce-publishing-quota/route.ts`:

```ts
/**
 * Cron endpoint: publikálási kvóta érvényesítése
 *
 * Hívás: GET /api/cron/enforce-publishing-quota
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * A keret feletti szalonokra publikálási tiltást ír. Kikapcsolt számlázásnál
 * és türelmi idő alatt nem csinál semmit.
 *
 * VPS cron: 0 4 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://domain.com/api/cron/enforce-publishing-quota
 */

import { NextRequest, NextResponse } from "next/server"

import { enforcePublishingQuota } from "@/lib/quota-enforcement"

export async function GET(req: NextRequest) {
  // Fail-closed: ha a titok nincs beállítva, a végpont nem hívható.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")

  if (!cronSecret) {
    console.error("[cron] enforce-publishing-quota: CRON_SECRET nincs beállítva, a hívás elutasítva")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const count = await enforcePublishingQuota()
    console.log(`[cron] enforce-publishing-quota: ${count} szalon publikálása letiltva`)
    return NextResponse.json({
      success: true,
      blocked: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[cron] enforce-publishing-quota hiba:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 6: Mutációs próba**

1. Kommentezd ki ideiglenesen a `lib/quota-enforcement.ts`-ben a türelmi idő ellenőrzését (`if (config.billingEnabledAt) { ... }` blokk).
2. Run: `npx vitest run tests/salon/quota-enforcement.test.ts`
   Expected: a "türelmi időn belül nem módosít semmit" tesztnek **buknia kell**.
3. Állítsd vissza, majd cseréld a `data` objektumot erre: `{ publishBlockedReason: "QUOTA", publishBlockedAt: new Date(), isPublished: false }`.
4. Run: ugyanaz. Expected: a "nem írja az isPublished mezőt" tesztnek **buknia kell**.
5. Állítsd vissza mindkettőt, futtasd újra — minden zöld.

Mindhárom futás tényleges kimenetét írd a jelentésbe.

- [ ] **Step 7: Teljes ellenőrzés és commit**

Run: `npm run test:run && npm run typecheck && npm run lint`

```bash
git add lib/quota-enforcement.ts app/api/cron/enforce-publishing-quota tests/salon/quota-enforcement.test.ts
git commit -m "feat(salon): kvóta-érvényesítő cron

A türelmi idő lejárta után szolgáltatónként a legrégebben publikált szalonok
maradnak a kereten belül, a többire publishBlockedReason='QUOTA' kerül.
A fizetett szalonok mentesülnek és nem fogyasztják az ingyenes keretet.

A tiltás soha nem írja az isPublished mezőt: az a tulajdonos szándékának
mezője, így a keret bővítése vagy fizetés után a szalon magától visszatér."
```

---

### Task 5: Az emlékeztető cron kapuzása

**Files:**
- Modify: `app/api/cron/subscription-reminders/route.ts`
- Test: `tests/salon/subscription-reminders-gate.test.ts`

**Interfaces:**
- Consumes: `getSubscriptionConfig()` a `lib/subscription.ts`-ből.
- Produces: nincs új export.

Ez a korábbi kódellenőrzés Ú4 találatának lezárása. A `createSalon` minden új szalonnak `freeTrialDays` (alapértelmezés 60) napos lejáratot ad, tehát kapuzás nélkül körülbelül két hónap múlva valós szolgáltatók kapnának lejárati figyelmeztetést arról, hogy eltűnik a szalonjuk — miközben az 1. fázisban semmi nem történne.

- [ ] **Step 1: Write the failing test**

Create `tests/salon/subscription-reminders-gate.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    getSubscriptionConfig: vi.fn(),
    sendSubscriptionExpiryWarning: vi.fn(),
    prisma: {
        subscription: {
            findMany: vi.fn(),
        },
    },
}))

vi.mock("@/lib/db", () => ({ default: mocks.prisma }))
vi.mock("@/lib/subscription", () => ({ getSubscriptionConfig: mocks.getSubscriptionConfig }))
vi.mock("@/lib/mail", () => ({ sendSubscriptionExpiryWarning: mocks.sendSubscriptionExpiryWarning }))

import { GET } from "../../app/api/cron/subscription-reminders/route"

/** A cron végpont hívása érvényes titokkal. */
function request() {
    return new Request("http://localhost/api/cron/subscription-reminders", {
        headers: { authorization: "Bearer teszt-titok" },
    }) as unknown as Parameters<typeof GET>[0]
}

describe("subscription-reminders cron kapuzása", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.CRON_SECRET = "teszt-titok"
        mocks.prisma.subscription.findMany.mockResolvedValue([])
    })

    it("kikapcsolt számlázásnál nem küld emailt és nem kérdez le", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue({ billingEnabled: false })

        const response = await GET(request())
        const body = await response.json()

        expect(body.skipped).toBe(true)
        expect(mocks.prisma.subscription.findMany).not.toHaveBeenCalled()
        expect(mocks.sendSubscriptionExpiryWarning).not.toHaveBeenCalled()
    })

    it("bekapcsolt számlázásnál lefut a lekérdezés", async () => {
        mocks.getSubscriptionConfig.mockResolvedValue({ billingEnabled: true })

        const response = await GET(request())
        const body = await response.json()

        expect(body.skipped).toBeUndefined()
        expect(mocks.prisma.subscription.findMany).toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salon/subscription-reminders-gate.test.ts`
Expected: FAIL — a `skipped` mező nem létezik, és a lekérdezés lefut

- [ ] **Step 3: A kapuzás beépítése**

Az `app/api/cron/subscription-reminders/route.ts`-ben egészítsd ki az importokat:

```ts
import { getSubscriptionConfig } from "@/lib/subscription"
```

Majd a `try {` blokk legelejére, a `const now = new Date()` sor **elé** szúrd be:

```ts
    // 1. fázis: a lejáratás ki van kapcsolva, tehát a figyelmeztetés félrevezető lenne.
    const config = await getSubscriptionConfig()
    if (!config.billingEnabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "A számlázás ki van kapcsolva.",
        timestamp: new Date().toISOString(),
      })
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/salon/subscription-reminders-gate.test.ts`
Expected: PASS — 2 teszt zöld

- [ ] **Step 5: Teljes ellenőrzés és commit**

Run: `npm run test:run && npm run typecheck && npm run lint`

```bash
git add app/api/cron/subscription-reminders/route.ts tests/salon/subscription-reminders-gate.test.ts
git commit -m "fix(cron): az emlékeztető email a billingEnabled kapcsoló mögé

Az 1. fázisban az expireFreeSalons nem csinál semmit, de az emlékeztető
cron változatlanul küldte a 'a szalon nem lesz látható' figyelmeztetést.
Mivel a createSalon minden új szalonnak 60 napos lejáratot ad, ez két
hónap múlva valós szolgáltatóknak ment volna ki, következmény nélkül."
```

---

### Task 6: Admin konfigurációs felület

**Files:**
- Create: `components/admin/BillingConfigManager.tsx`
- Modify: `app/dashboard/admin/settings/page.tsx`

**Interfaces:**
- Consumes: `getSubscriptionConfigAdmin()` és `updateSubscriptionConfig()` a `lib/actions/subscription-config.ts`-ből (Task 3).
- Produces: `<BillingConfigManager />` React komponens.

- [ ] **Step 1: A komponens**

Create `components/admin/BillingConfigManager.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getSubscriptionConfigAdmin, updateSubscriptionConfig } from "@/lib/actions/subscription-config"

type Form = {
  billingEnabled: boolean
  freeSalonSlots: number
  freeSlotTrialDays: number
  gracePeriodDays: number
}

const URES: Form = {
  billingEnabled: false,
  freeSalonSlots: 1,
  freeSlotTrialDays: 0,
  gracePeriodDays: 30,
}

function formatDate(value: Date | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value))
}

export function BillingConfigManager() {
  const [form, setForm] = useState<Form>(URES)
  const [billingEnabledAt, setBillingEnabledAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getSubscriptionConfigAdmin()
      if (result.success && result.config) {
        setForm({
          billingEnabled: result.config.billingEnabled,
          freeSalonSlots: result.config.freeSalonSlots,
          freeSlotTrialDays: result.config.freeSlotTrialDays,
          gracePeriodDays: result.config.gracePeriodDays,
        })
        setBillingEnabledAt(result.config.billingEnabledAt)
      }
    } catch (error) {
      console.error("Számlázási beállítások betöltési hiba:", error)
      toast.error("Nem sikerült a beállítások betöltése.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (form.billingEnabled && !billingEnabledAt && !window.confirm(
      `Bekapcsolod a számlázást. Ezzel elindul a ${form.gracePeriodDays} napos türelmi idő, `
      + `utána szolgáltatónként ${form.freeSalonSlots} szalon marad ingyenesen publikálva, a többi lekerül. Folytatod?`
    )) {
      return
    }

    try {
      setSaving(true)
      const result = await updateSubscriptionConfig(form)
      if (!result.success) {
        toast.error(result.error || "Nem sikerült a mentés.")
        return
      }
      toast.success("A beállítások elmentve.")
      await load()
    } catch (error) {
      console.error("Számlázási beállítások mentési hiba:", error)
      toast.error("Nem sikerült a mentés.")
    } finally {
      setSaving(false)
    }
  }

  const graceEndsAt = billingEnabledAt
    ? new Date(new Date(billingEnabledAt).getTime() + form.gracePeriodDays * 24 * 60 * 60 * 1000)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publikálási korlátok</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Ezekkel a beállításokkal kapcsolható a termék három fázisa. Amíg a számlázás ki van kapcsolva,
          minden szalon ingyenesen publikálható.
        </p>

        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <Label htmlFor="billingEnabled" className="text-sm font-bold">Számlázás bekapcsolva</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.billingEnabled
                    ? "A publikálási keret érvényes."
                    : "1. fázis: minden szalon ingyenesen publikálható."}
                </p>
              </div>
              <Switch
                id="billingEnabled"
                checked={form.billingEnabled}
                onCheckedChange={(checked) => setForm({ ...form, billingEnabled: checked })}
              />
            </div>

            {form.billingEnabled && billingEnabledAt && (
              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
                <p>Bekapcsolva: <strong>{formatDate(billingEnabledAt)}</strong></p>
                {graceEndsAt && (
                  <p className="mt-1">Türelmi idő vége: <strong>{formatDate(graceEndsAt)}</strong></p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="freeSalonSlots">Ingyenes szalonhelyek</Label>
                <Input
                  id="freeSalonSlots"
                  type="number"
                  min={0}
                  value={form.freeSalonSlots}
                  onChange={(e) => setForm({ ...form, freeSalonSlots: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Szolgáltatónként ennyi szalon ingyenes.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeSlotTrialDays">Ingyenes időszak (nap)</Label>
                <Input
                  id="freeSlotTrialDays"
                  type="number"
                  min={0}
                  value={form.freeSlotTrialDays}
                  onChange={(e) => setForm({ ...form, freeSlotTrialDays: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">0 = az ingyenes hely nem jár le.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gracePeriodDays">Türelmi idő (nap)</Label>
                <Input
                  id="gracePeriodDays"
                  type="number"
                  min={0}
                  value={form.gracePeriodDays}
                  onChange={(e) => setForm({ ...form, gracePeriodDays: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">A bekapcsolástól számítva.</p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="rounded-full font-bold">
              {saving ? "Mentés..." : "Mentés"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Beillesztés az admin beállítások oldalra**

Az `app/dashboard/admin/settings/page.tsx`-ben add hozzá az importot a `CategoryManager` import mellé:

```tsx
import { BillingConfigManager } from "@/components/admin/BillingConfigManager"
```

Majd a `<CategoryManager />` sor **elé** szúrd be:

```tsx
                    <BillingConfigManager />
```

- [ ] **Step 3: Ellenőrzés**

Run: `npm run typecheck && npm run lint && npm run test:run && npm run build`
Expected: mind hibátlan

A `components/ui/switch.tsx` a Radix `SwitchPrimitives.Root` burkolója, tehát a `checked` és `onCheckedChange` tulajdonságokat támogatja. A `components/ui/input.tsx` a natív `React.InputHTMLAttributes<HTMLInputElement>` típust használja, tehát a `type="number"` és a `min` is átmegy rajta. A fenti kód mindkettőt helyesen hívja.

- [ ] **Step 4: Commit**

```bash
git add components/admin/BillingConfigManager.tsx app/dashboard/admin/settings/page.tsx
git commit -m "feat(admin): publikálási korlátok szerkesztő felülete

A SubscriptionConfig eddig nem volt szerkeszthető felületről. Az admin
innen kapcsolja a termékfázisokat: számlázás be/ki, ingyenes szalonhelyek,
ingyenes időszak és türelmi idő. A bekapcsolás megerősítést kér, és
megmutatja, mikor jár le a türelmi idő."
```

---

### Task 7: Szolgáltatói felület

**Files:**
- Modify: `components/salon-console/salon-publish-toggle.tsx` (a `blockedText` függvény)
- Create: `components/salons/quota-indicator.tsx`
- Modify: `app/dashboard/salons/page.tsx`

**Interfaces:**
- Consumes: `getSalonQuotaStatus(ownerId)` a `lib/salon-publishing.ts`-ből (Task 2), ami `QuotaStatus` objektumot ad vissza.
- Produces: `<QuotaIndicator ownerId={...} />` React komponens.

- [ ] **Step 1: A `QUOTA` ág a publikálási kapcsolóban**

A `components/salon-console/salon-publish-toggle.tsx`-ben cseréld le a `blockedText` függvényt:

```tsx
function blockedText(reason: string) {
  if (reason === "BILLING") {
    return "A publikálás előfizetési okból le van tiltva."
  }
  if (reason === "QUOTA") {
    return "Betelt az ingyenesen publikálható szalonok kerete. Vegyél le egy másik szalont, vagy bővítsd a keretet."
  }
  return "A publikálás adminisztrátori döntés miatt le van tiltva."
}
```

- [ ] **Step 2: A kvóta-jelző szerver action**

A `lib/actions/salon.ts` végére szúrd be:

```ts
/** A bejelentkezett szolgáltató kvóta-állapota a szalonlista fejlécéhez. */
export async function getMyQuotaStatus() {
    const sessionUserId = await requireSession()
    try {
        return await getSalonQuotaStatus(sessionUserId)
    } catch (error) {
        // A felület inkább ne mutasson semmit, mint pontatlan keretet.
        console.error("Kvóta-állapot lekérdezési hiba:", error)
        return null
    }
}
```

A `lib/actions/salon.ts` importjai között jelenleg ez a sor szerepel:

```ts
import { canPublishSalon, type PublishPolicyResult } from "@/lib/salon-publishing"
```

Cseréld le erre:

```ts
import { canPublishSalon, getSalonQuotaStatus, type PublishPolicyResult } from "@/lib/salon-publishing"
```

- [ ] **Step 3: A jelző komponens**

Create `components/salons/quota-indicator.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { Clock, Infinity as InfinityIcon, Store } from "lucide-react"

import { getMyQuotaStatus } from "@/lib/actions/salon"

type QuotaStatus = {
  billingEnabled: boolean
  freeSlots: number
  usedSlots: number
  inGracePeriod: boolean
  graceEndsAt: Date | string | null
}

function napokMulva(date: Date | string) {
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}

export function QuotaIndicator() {
  const [status, setStatus] = useState<QuotaStatus | null>(null)

  useEffect(() => {
    let aktiv = true
    getMyQuotaStatus()
      .then((result) => { if (aktiv) setStatus(result as QuotaStatus | null) })
      .catch(() => { if (aktiv) setStatus(null) })
    return () => { aktiv = false }
  }, [])

  if (!status) return null

  // 1. fázis: nincs mit közölni, minden szalon ingyenesen publikálható.
  if (!status.billingEnabled) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-muted-foreground">
        <InfinityIcon className="h-4 w-4" />
        Korlátlan publikálás
      </div>
    )
  }

  const betelt = status.usedSlots >= status.freeSlots

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
        betelt ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"
      }`}>
        <Store className="h-4 w-4" />
        {status.usedSlots} / {status.freeSlots} ingyenes hely
      </div>

      {status.inGracePeriod && status.graceEndsAt && (
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-muted-foreground">
          <Clock className="h-4 w-4" />
          Türelmi idő: még {napokMulva(status.graceEndsAt)} nap
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Beillesztés a szalonlistába**

Az `app/dashboard/salons/page.tsx`-ben add hozzá az importot:

```tsx
import { QuotaIndicator } from "@/components/salons/quota-indicator"
```

Majd a fejléc `<Button onClick={() => setIsCreateModalOpen(true)} ...>` elemét fogd közre egy konténerbe, hogy a jelző mellé kerüljön. Cseréld ezt:

```tsx
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-12 rounded-full px-6 font-bold"
                        >
                            <Plus className="h-4 w-4" />
                            Új szalon
                        </Button>
```

erre:

```tsx
                        <div className="flex flex-col items-start gap-3 sm:items-end">
                            <QuotaIndicator />
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="h-12 rounded-full px-6 font-bold"
                            >
                                <Plus className="h-4 w-4" />
                                Új szalon
                            </Button>
                        </div>
```

- [ ] **Step 5: A `QUOTA` státusz a szalonkártyán**

Ugyanebben a fájlban, a szalonkártya bal felső státuszjelzőjében a `salon.publishBlockedReason ? (...)` ág szövegét pontosítsd. Cseréld ezt:

```tsx
                                            {salon.publishBlockedReason ? (
                                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 shadow-sm">
                                                    Tiltva
                                                </span>
```

erre:

```tsx
                                            {salon.publishBlockedReason ? (
                                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 shadow-sm">
                                                    {salon.publishBlockedReason === "QUOTA" ? "Kereten kívül" : "Tiltva"}
                                                </span>
```

- [ ] **Step 6: Ellenőrzés**

Run: `npm run typecheck && npm run lint && npm run test:run && npm run build`
Expected: mind hibátlan

- [ ] **Step 7: Commit**

```bash
git add components/salon-console/salon-publish-toggle.tsx components/salons/quota-indicator.tsx app/dashboard/salons/page.tsx lib/actions/salon.ts
git commit -m "feat(salon): kvóta-jelzés a szolgáltatói felületen

A szalonlista fejlécében látszik a keret állása és a türelmi idő
visszaszámlálása, a szalonkártyán a 'Kereten kívül' állapot, a publikálási
kapcsolóban pedig a kvóta miatti tiltás magyarázata.

1. fázisban a jelző 'Korlátlan publikálás' feliratot mutat."
```

---

### Task 8: Dokumentáció

**Files:**
- Modify: `README.md` (a „Szalon publikálási állapot" szakasz)
- Modify: `.env.production.example`

**Interfaces:**
- Consumes: minden korábbi task.
- Produces: nincs kód.

- [ ] **Step 1: A README bővítése**

A `README.md`-ben a „### Szalon publikálási állapot" szakasz végére, a `billingEnabled`-ről szóló bekezdés helyére szúrd be:

```markdown
#### Publikálási korlátok és fázisok

A termék három fázisban vezeti be a fizetős publikálást. A váltás adminból történik, kódmódosítás nélkül: **Admin → Beállítások → Publikálási korlátok**.

| Beállítás | Jelentés | 1. fázis | 2. fázis | 3. fázis |
| --- | --- | --- | --- | --- |
| `billingEnabled` | Fő kapcsoló | `false` | `true` | `true` |
| `freeSalonSlots` | Ingyenes szalonhelyek szolgáltatónként | – | 1 | 1 |
| `freeSlotTrialDays` | Az ingyenes hely élettartama napokban, 0 = korlátlan | – | 0 | X |
| `gracePeriodDays` | Türelmi idő a szigorítás után | – | 30 | 30 |

A `billingEnabled` bekapcsolásakor rögzül a `billingEnabledAt`, és ettől számít a türelmi idő. Alatta még mindenki publikálhat; a lejárta után az `/api/cron/enforce-publishing-quota` cron szolgáltatónként a legrégebben publikált szalonokat hagyja a kereten belül, a többire `publishBlockedReason = "QUOTA"` kerül.

**A kvóta soha nem írja az `isPublished` mezőt** — az a tulajdonos szándékának mezője. Így a szolgáltató látja, hogy nem ő vette le a szalont, és a keret bővítése vagy fizetés után a szalon magától visszatér.

A fizetési szolgáltató **még nincs eldöntve**. A beillesztési pont a `hasActivePaidSubscription()` függvény a [`lib/salon-publishing.ts`](lib/salon-publishing.ts)-ben: ma a `Subscription` rekord `plan`/`status` mezőiből dönt, és amikor a fizetés bekerül, elég ezt az egy függvényt átírni.

#### Cron feladatok

| Végpont | Mit csinál | Javasolt időzítés |
| --- | --- | --- |
| `/api/cron/expire-free-salons` | Lejárt FREE szalonok publikálásának tiltása | `0 3 * * *` |
| `/api/cron/enforce-publishing-quota` | A keret feletti szalonok tiltása | `0 4 * * *` |
| `/api/cron/subscription-reminders` | Lejárat előtti emlékeztető email | `0 9 * * *` |

Mindhárom `CRON_SECRET`-tel hívható, és mindhárom no-op, amíg a `billingEnabled` ki van kapcsolva.
```

- [ ] **Step 2: A `.env.production.example` kiegészítése**

A `.env.production.example`-ben a `CRON_SECRET` szakasz használati példáihoz vedd fel a harmadik cron feladatot. Cseréld ezt:

```
#   0 3 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://glowyspot.com/api/cron/expire-free-salons
#   0 9 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://glowyspot.com/api/cron/subscription-reminders
```

erre:

```
#   0 3 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://glowyspot.com/api/cron/expire-free-salons
#   0 4 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://glowyspot.com/api/cron/enforce-publishing-quota
#   0 9 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://glowyspot.com/api/cron/subscription-reminders
```

- [ ] **Step 3: Commit**

```bash
git add README.md .env.production.example
git commit -m "docs: publikálási korlátok és cron feladatok dokumentálása

A README leírja a három fázist, a négy beállítást és a fizetési
szolgáltató beillesztési pontját. A cron feladatok táblázatba szedve,
a .env példa kiegészítve az új végponttal."
```

---

## Kézi ellenőrzés a terv végén

Ezt a projektvezető végzi, futó alkalmazásban:

1. **1. fázis változatlansága:** a `/dashboard/salons` oldalon „Korlátlan publikálás" jelzés, minden szalon publikálható.
2. **Fázisváltás:** Admin → Beállítások → Publikálási korlátok → számlázás bekapcsolása. A megerősítő kérdés megjelenik, mentés után látszik a türelmi idő vége.
3. **Türelmi idő alatt:** a szolgáltatói oldalon megjelenik a keret állása és a visszaszámlálás, de minden szalon publikálva marad.
4. **Kvóta-érvényesítés:** a `gracePeriodDays` ideiglenes 0-ra állítása után az `/api/cron/enforce-publishing-quota` hívása érvényes `CRON_SECRET`-tel — a keret feletti szalonok „Kereten kívül" állapotba kerülnek, és eltűnnek a publikus felületről.
5. **Az `isPublished` érintetlensége:** adatbázisban ellenőrizve a tiltott szalonoknál `isPublished` továbbra is `true`.
6. **Visszaállás:** a `freeSalonSlots` megnövelése és a cron újrafuttatása után a szalonok visszatérnek — a tulajdonosnak nem kellett újrapublikálnia.
7. **Naplózás:** az `/dashboard/admin/audit-log` oldalon megjelennek az `ADMIN_BILLING_CONFIG_UPDATE` és `SALON_QUOTA_BLOCKED` események.
8. **Visszaállítás:** a beállítások visszaállítása 1. fázisra (`billingEnabled = false`), és a cron újrafuttatásával a tiltások feloldása.

---

## Nyitott pontok a terv után

| Terület | Megjegyzés |
| --- | --- |
| D csomag | Fizetési szolgáltató (Stripe / Barion / SimplePay). A beillesztési pont a `hasActivePaidSubscription()`. |
| `SubscriptionBadge.tsx` | Mutat lejárati állapotot, de sehonnan nincs meghívva — holt kód. Ha bekötik a felületre, a `billingEnabled` mögé kell tenni. |
| Türelmi idős értesítő emailek | A projektgazda döntése szerint most nincsenek; a jelzés csak a felületen történik. |
| A `Subscription` Stripe-mezői | A sémában maradnak érintetlenül. A D csomag dönti el, hogy megtartja, átnevezi vagy szolgáltató-semlegesre cseréli őket. |
| Kvóta-feloldás fizetés után | A `publishBlockedReason = "QUOTA"` feloldása a D csomag feladata lesz, a fizetés visszaigazolásakor. |
