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
