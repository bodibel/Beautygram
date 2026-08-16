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
