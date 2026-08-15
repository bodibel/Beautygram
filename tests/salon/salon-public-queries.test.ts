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
