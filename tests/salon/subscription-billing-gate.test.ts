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
