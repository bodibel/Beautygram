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

    it("a canPublishSalon hibája esetén is sikerül a létrehozás, de publikálatlanul", async () => {
        mocks.canPublishSalon.mockRejectedValue(new Error("Adatbázis hiba"))

        await expect(createSalon(ERVENYES_ADAT)).resolves.toMatchObject({ id: "salon-uj" })

        const createArg = mocks.prisma.salon.create.mock.calls[0][0]
        expect(createArg.data.isPublished).toBe(false)
        expect(createArg.data.publishedAt).toBeNull()
    })
})
