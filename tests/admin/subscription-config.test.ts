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
