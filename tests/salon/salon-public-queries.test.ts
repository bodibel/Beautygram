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
        service: {
            findFirst: vi.fn(),
        },
        booking: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        message: {
            create: vi.fn(),
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

import { createBooking, getAllSalons, getFeaturedSalons, getPublicSalonData, getRecentPosts, getRecentSalons, sendMessage } from "../../lib/actions/salon"

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
        mocks.prisma.post.findMany.mockResolvedValue([])
    })

    it("getAllSalons a teljes publikus szűrőt használja", async () => {
        await getAllSalons()

        expectPublicFilter(mocks.prisma.salon.findMany.mock.calls[0][0].where)
    })

    it("getRecentSalons a teljes publikus szűrőt használja", async () => {
        await getRecentSalons(4)

        expectPublicFilter(mocks.prisma.salon.findMany.mock.calls[0][0].where)
    })

    it("getFeaturedSalons prémium lekérdezése a teljes publikus szűrőt használja", async () => {
        await getFeaturedSalons({})

        const where = mocks.prisma.salon.findMany.mock.calls[0][0].where
        expectPublicFilter(where)
    })

    it("getFeaturedSalons népszerű-feltöltő lekérdezése is a teljes publikus szűrőt használja", async () => {
        await getFeaturedSalons({})

        // A prémium lekérdezés üres tömböt ad vissza a mock miatt, ezért a feltöltő
        // (népszerű) lekérdezés is lefut — ez a második findMany hívás.
        expect(mocks.prisma.salon.findMany.mock.calls.length).toBe(2)
        const where = mocks.prisma.salon.findMany.mock.calls[1][0].where
        expectPublicFilter(where)
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

    it("getRecentPosts szűrő nélkül a teljes publikus szűrőt használja", async () => {
        await getRecentPosts()

        const where = mocks.prisma.post.findMany.mock.calls[0][0].where
        expectPublicFilter(where.salon)
    })

    it("getRecentPosts kategória-szűrő mellett is megőrzi a láthatósági feltételeket", async () => {
        await getRecentPosts(1, { categories: ["haj"] })

        const where = mocks.prisma.post.findMany.mock.calls[0][0].where
        // Ezt a tesztet kellett volna elkapnia annak a hibának, ahol a kategória-szűrés
        // felülírta (nem összefésülte) a láthatósági feltételeket. Az AND szerkezet miatt
        // a láthatósági feltételek és a szalon-szűrők külön tagként szerepelnek.
        expect(where.salon.AND).toHaveLength(2)
        expectPublicFilter(where.salon.AND[0])
        expect(where.salon.AND[1]).toMatchObject({ categories: { hasSome: ["haj"] } })
    })

    it("getRecentPosts hely-szűrő (lat/lng/radius) mellett is megőrzi a láthatósági feltételeket", async () => {
        await getRecentPosts(1, { lat: 47.4979, lng: 19.0402, radius: 10 })

        const where = mocks.prisma.post.findMany.mock.calls[0][0].where
        expect(where.salon.AND).toHaveLength(2)
        expectPublicFilter(where.salon.AND[0])
        expect(where.salon.AND[1]).toHaveProperty("lat")
        expect(where.salon.AND[1]).toHaveProperty("lng")
    })
})

describe("createBooking és sendMessage láthatósági ellenőrzése", () => {
    const SESSION_USER_ID = "sajat-felhasznalo-1"
    const OTHER_USER_ID = "masik-felhasznalo-1"
    const SALON_OWNER_ID = "szalon-tulaj-1"

    beforeEach(() => {
        vi.clearAllMocks()
        mocks.requireSession.mockResolvedValue(SESSION_USER_ID)
        // A createBooking függvény sikeres végrehajtásához szükséges mockingok:
        // - service.findFirst: a szolgáltatás megkeresése
        // - booking.findFirst: a meglévő foglalások ellenőrzése
        mocks.prisma.service.findFirst.mockResolvedValue({ id: "szolgaltatas-1" })
        mocks.prisma.booking.findFirst.mockResolvedValue(null)
    })

    it.each([
        ["előfizetés miatt tiltva (BILLING)", { isPublished: true, publishBlockedReason: "BILLING" }],
        ["nincs publikálva", { isPublished: false, publishBlockedReason: null }],
    ])("createBooking hibát dob, ha a szalon %s", async (_leiras, overrides) => {
        mocks.prisma.salon.findUnique.mockResolvedValue({
            id: "szalon-1",
            ownerId: SALON_OWNER_ID,
            isActive: true,
            allowBookings: true,
            ...overrides,
        })

        await expect(createBooking({
            date: "2026-09-01",
            time: "10:00",
            userId: SESSION_USER_ID,
            salonId: "szalon-1",
            serviceId: "szolgaltatas-1",
        })).rejects.toThrow("Ez a szalon jelenleg nem érhető el.")

        expect(mocks.prisma.booking.create).not.toHaveBeenCalled()
    })

    it("sendMessage hibát dob és nem hoz létre üzenetet, ha a megadott szalon nem látható", async () => {
        mocks.prisma.salon.findUnique.mockResolvedValue({
            isActive: true,
            isPublished: false,
            publishBlockedReason: null,
        })

        await expect(sendMessage({
            senderId: SESSION_USER_ID,
            receiverId: OTHER_USER_ID,
            content: "Szia, érdeklődnék egy időpont miatt!",
            salonId: "szalon-1",
        })).rejects.toThrow()

        expect(mocks.prisma.message.create).not.toHaveBeenCalled()
    })

    it("sendMessage szalonId nélkül is működik, nem fut bele a szalon-láthatósági ellenőrzésbe", async () => {
        mocks.prisma.message.create.mockResolvedValue({ id: "uzenet-1" })

        await expect(sendMessage({
            senderId: SESSION_USER_ID,
            receiverId: OTHER_USER_ID,
            content: "Szia, érdeklődnék egy időpont miatt!",
        })).resolves.toMatchObject({ id: "uzenet-1" })

        expect(mocks.prisma.salon.findUnique).not.toHaveBeenCalled()
        expect(mocks.prisma.message.create).toHaveBeenCalled()
    })
})
