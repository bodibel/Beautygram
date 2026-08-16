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
        // A findMany-nak sem szabad lefutnia: a türelmi időnek a lekérdezés
        // előtt kell kilépnie, különben ez a teszt üres adaton is zölden
        // menne át akkor is, ha a türelmi idő ellenőrzése hiányozna.
        expect(mocks.prisma.salon.findMany).not.toHaveBeenCalled()
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

    it("a lejárt próbaidejű szalon felszabadítja a helyét, a próbaidőn belüli szalon nem kap tiltást", async () => {
        // Két szalon kell ahhoz, hogy megkülönböztessük: a lejárt próbaidejű
        // szalon ténylegesen átadja-e a felszabaduló ingyenes helyet a
        // következő szalonnak, nem csak önmagát tiltja. Egyetlen szalonnal
        // ez a különbség nem látszana (lásd az előző tesztet).
        mocks.getSubscriptionConfig.mockResolvedValue(config({ freeSalonSlots: 1, freeSlotTrialDays: 30 }))
        mocks.prisma.salon.findMany.mockResolvedValue([
            salon("regi-lejart", "owner-1", "2026-01-10T00:00:00.000Z"),
            salon("uj-probaidoben", "owner-1", "2026-05-15T00:00:00.000Z"),
        ])
        mocks.prisma.salon.updateMany.mockResolvedValue({ count: 1 })

        await expect(enforcePublishingQuota()).resolves.toBe(1)

        const call = mocks.prisma.salon.updateMany.mock.calls[0][0]
        expect(call.where.id.in).toEqual(["regi-lejart"])
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
