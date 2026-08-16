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
