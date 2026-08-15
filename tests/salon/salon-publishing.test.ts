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
