import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireSession: vi.fn(),
    requireAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    prisma: {
        booking: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            updateMany: vi.fn(),
            findUniqueOrThrow: vi.fn(),
        },
        message: {
            findUnique: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
        },
        like: {
            findUnique: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
        },
        category: {
            create: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
        },
        salon: {
            findUnique: vi.fn(),
            update: vi.fn(),
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

vi.mock("@/lib/subscription", () => ({
    generateSalonFingerprint: vi.fn(() => "fingerprint"),
    checkFingerprintDuplicate: vi.fn(() => ({ duplicate: false })),
    initSubscription: vi.fn(),
    canCreatePost: vi.fn(() => true),
    incrementPostCount: vi.fn(),
    canUploadVideo: vi.fn(() => true),
    canUseBooking: vi.fn(() => true),
}))

vi.mock("@/lib/slug", () => ({
    generateUniqueSlug: vi.fn(() => "test-salon"),
}))

vi.mock("@/lib/booking/booking-policy", () => ({
    canAcceptBookingRequest: vi.fn(() => ({ allowed: true })),
    canCancelMyBooking: vi.fn(() => ({ allowed: true })),
    canHandleBookingRequest: vi.fn(() => ({ allowed: true })),
    formatBookingDecisionMessage: vi.fn(() => ({ subject: "Booking updated", content: "Booking updated" })),
    formatBookingVisitorCancellationMessage: vi.fn(() => ({ subject: "Booking cancelled", content: "Booking cancelled" })),
    validateBookingRequestFields: vi.fn(() => ({ allowed: true })),
}))

vi.mock("@/lib/auth/role-policy", () => ({
    canDeactivateAdminUser: vi.fn(() => ({ allowed: true })),
    canDeleteAdminUser: vi.fn(() => ({ allowed: true })),
    canRemoveAdminRole: vi.fn(() => ({ allowed: true })),
    isUserRole: vi.fn((role: string) => ["visitor", "provider", "admin"].includes(role)),
}))

import { createCategory } from "../../lib/actions/category"
import {
    acceptBookingRequest,
    cancelMyBooking,
    markMessageAsRead,
    toggleLike,
} from "../../lib/actions/salon"
import { updateUserAdmin } from "../../lib/actions/user"

describe("server action ownership and role guards", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // Mocked unit coverage only: these tests do not replace DB fixture tests for real relation constraints.
    it("blocks providers from accepting bookings owned by another salon", async () => {
        mocks.requireSession.mockResolvedValue("provider-2")
        mocks.prisma.booking.findUnique.mockResolvedValue({
            id: "booking-1",
            status: "pending",
            date: new Date("2099-01-01"),
            time: "10:00",
            userId: "visitor-1",
            salonId: "salon-1",
            salon: { ownerId: "provider-1", name: "Anna Szalon" },
            service: { name: "Manikűr" },
        })

        await expect(acceptBookingRequest("booking-1")).rejects.toThrow("Nincs jogosults")
        expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
    })

    it("blocks visitors from cancelling another user's booking", async () => {
        mocks.requireSession.mockResolvedValue("visitor-2")
        mocks.prisma.booking.findUnique.mockResolvedValue({
            id: "booking-1",
            status: "pending",
            date: new Date("2099-01-01"),
            time: "10:00",
            userId: "visitor-1",
            salonId: "salon-1",
            salon: { ownerId: "provider-1" },
            service: { name: "Manikűr" },
        })

        await expect(cancelMyBooking("booking-1")).rejects.toThrow("Nincs jogosults")
        expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
    })

    it("blocks users from marking another user's message as read", async () => {
        mocks.requireSession.mockResolvedValue("user-2")
        mocks.prisma.message.findUnique.mockResolvedValue({ receiverId: "user-1" })

        await expect(markMessageAsRead("message-1")).rejects.toThrow("Nincs jogosults")
        expect(mocks.prisma.message.update).not.toHaveBeenCalled()
    })

    it("blocks non-admin category mutations", async () => {
        mocks.requireAdminSession.mockRejectedValue(new Error("Unauthorized"))

        await expect(createCategory({ name: "Nails", slug: "nails" })).rejects.toThrow("Unauthorized")
        expect(mocks.prisma.category.create).not.toHaveBeenCalled()
    })

    it("returns Unauthorized for non-admin user mutations", async () => {
        mocks.requireAdminSession.mockRejectedValue(new Error("Unauthorized"))

        await expect(updateUserAdmin("user-1", { name: "New Name" })).resolves.toEqual({
            success: false,
            error: "Unauthorized",
        })
        expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    })

    it("blocks inactive users before mutation logic when requireSession rejects", async () => {
        mocks.requireSession.mockRejectedValue(new Error("Hitelesítés szükséges."))

        await expect(toggleLike("post-1", "inactive-user")).rejects.toThrow("Hiteles")
        expect(mocks.prisma.like.findUnique).not.toHaveBeenCalled()
    })
})
