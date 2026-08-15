import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    requireSession: vi.fn(),
    requireAdminSession: vi.fn(),
    revalidatePath: vi.fn(),
    writeAuditLog: vi.fn(),
    tx: {
        user: { update: vi.fn() },
        salon: { updateMany: vi.fn(), findMany: vi.fn() },
        post: { updateMany: vi.fn() },
    },
    prisma: {
        user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
        $transaction: vi.fn(),
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

vi.mock("@/lib/auth/role-policy", () => ({
    canDeactivateAdminUser: vi.fn(() => ({ allowed: true })),
    canDeleteAdminUser: vi.fn(() => ({ allowed: true })),
    canRemoveAdminRole: vi.fn(() => ({ allowed: true })),
    isUserRole: vi.fn(() => true),
}))

import { restoreAccount, toggleUserActiveAdmin } from "../../lib/actions/user"

const USER_ID = "provider-1"

/**
 * Minden szalon-visszaállító hívás vizsgálata: sem a szűrő, sem az írt adat
 * nem érintheti a publikálási mezőket.
 */
function expectDoesNotTouchPublishingFields() {
    for (const call of mocks.tx.salon.updateMany.mock.calls) {
        const { where, data } = call[0]
        expect(data).not.toHaveProperty("publishBlockedReason")
        expect(data).not.toHaveProperty("publishBlockedAt")
        expect(data).not.toHaveProperty("isPublished")
        expect(where).not.toHaveProperty("publishBlockedReason")
        expect(where).not.toHaveProperty("isPublished")
    }
}

describe("fiók-visszaállítás nem oldja fel az előfizetési tiltást", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.requireSession.mockResolvedValue(USER_ID)
        mocks.requireAdminSession.mockResolvedValue({ id: "admin-1", role: "admin" })
        mocks.tx.salon.findMany.mockResolvedValue([])
        mocks.prisma.$transaction.mockImplementation(
            (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx)
        )
    })

    it("a restoreAccount csak a fiókszintű mezőket állítja vissza", async () => {
        await restoreAccount(USER_ID)

        expectDoesNotTouchPublishingFields()
        expect(mocks.tx.salon.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isActive: true, inactivatedAt: null } })
        )
    })

    it("az adminisztrátori feloldás csak a fiókszintű mezőket állítja vissza", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({ isActive: false, role: "provider" })

        await toggleUserActiveAdmin(USER_ID)

        expectDoesNotTouchPublishingFields()
    })
})
