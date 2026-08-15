import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireSession: vi.fn(),
    requireAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    writeAuditLog: vi.fn(),
    prisma: {
        salon: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        teamMember: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}))

vi.mock("@/lib/auth-utils", () => ({
    requireSession: mocks.requireSession,
    requireAdminSession: mocks.requireAdminSession,
}))

vi.mock("@/lib/db", () => ({
    default: mocks.prisma,
}))

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/audit-log", () => ({
    AUDIT_ACTIONS: new Proxy({}, { get: (_target, prop) => String(prop) }),
    writeAuditLog: mocks.writeAuditLog,
    getAuditActionContext: vi.fn(async () => ({ ipAddress: null, userAgent: null })),
    getAuditRequestContext: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}))

vi.mock("@/lib/subscription", () => ({
    generateSalonFingerprint: vi.fn(() => "fingerprint"),
    checkFingerprintDuplicate: vi.fn(() => ({ duplicate: false })),
    initSubscription: vi.fn(),
    canCreatePost: vi.fn(() => true),
    incrementPostCount: vi.fn(),
    canUploadVideo: vi.fn(() => true),
}))

vi.mock("@/lib/slug", () => ({
    generateUniqueSlug: vi.fn(() => "test-salon"),
}))

vi.mock("@/lib/booking/booking-policy", () => ({
    canAcceptBookingRequest: vi.fn(() => ({ allowed: true })),
    canCancelMyBooking: vi.fn(() => ({ allowed: true })),
    canHandleBookingRequest: vi.fn(() => ({ allowed: true })),
    formatBookingDecisionMessage: vi.fn(() => ({ subject: "", content: "" })),
    formatBookingVisitorCancellationMessage: vi.fn(() => ({ subject: "", content: "" })),
    validateBookingRequestFields: vi.fn(() => ({ allowed: true })),
}))

import { updateSalon } from "../../lib/actions/salon"

const OWNER_ID = "owner-1"
const SALON_ID = "salon-1"

/** A tranzakciót a mockolt prisma kliensen futtatja le. */
function runTransaction(callback: (tx: typeof mocks.prisma) => unknown) {
    return callback(mocks.prisma)
}

describe("updateSalon mass-assignment védelem", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.requireSession.mockResolvedValue(OWNER_ID)
        mocks.prisma.salon.findUnique.mockResolvedValue({ ownerId: OWNER_ID })
        mocks.prisma.salon.update.mockResolvedValue({ id: SALON_ID })
        mocks.prisma.$transaction.mockImplementation(runTransaction)
    })

    it("átengedi a szolgáltató által szerkeszthető mezőket", async () => {
        await updateSalon(SALON_ID, { name: "Új név", city: "Budapest", allowBookings: false })

        expect(mocks.prisma.salon.update).toHaveBeenCalledWith({
            where: { id: SALON_ID },
            data: { name: "Új név", city: "Budapest", allowBookings: false },
        })
    })

    it.each([
        ["ownerId", { ownerId: "masik-felhasznalo" }],
        ["isActive", { isActive: true }],
        ["rating", { rating: 5 }],
        ["reviewCount", { reviewCount: 9999 }],
        ["slug", { slug: "eltulajdonitott-slug" }],
        ["salonFingerprint", { salonFingerprint: "hamis" }],
        ["inactivatedAt", { inactivatedAt: null }],
    ])("eldobja a védett %s mezőt", async (field, payload) => {
        await updateSalon(SALON_ID, { name: "Új név", ...payload })

        const updateArg = mocks.prisma.salon.update.mock.calls[0][0]
        expect(updateArg.data).not.toHaveProperty(field)
        // A jogos mező ettől még átmegy.
        expect(updateArg.data).toHaveProperty("name", "Új név")
    })

    it("akkor sem enged át védett mezőt, ha csak azt küldik", async () => {
        await updateSalon(SALON_ID, { ownerId: "masik-felhasznalo" })

        expect(mocks.prisma.salon.update).toHaveBeenCalledWith({
            where: { id: SALON_ID },
            data: {},
        })
    })
})
