import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
    getServerSession: vi.fn(),
    findUnique: vi.fn(),
}))

vi.mock("next-auth", () => ({
    getServerSession: mocks.getServerSession,
}))

vi.mock("@/lib/auth-options", () => ({
    authOptions: {},
}))

vi.mock("@/lib/db", () => ({
    default: {
        user: {
            findUnique: mocks.findUnique,
        },
    },
}))

import {
    getActiveSessionUser,
    requireActiveSessionUser,
    requireAdminSession,
    requireSession,
} from "../../lib/auth-utils"

describe("active-user server guard", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // Mocked unit coverage only: this catches guard regressions, but does not replace DB fixture/e2e auth tests.
    it("allows active users through the guard", async () => {
        mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } })
        mocks.findUnique.mockResolvedValue({
            id: "user-1",
            role: "visitor",
            name: "Active User",
            email: "active@example.com",
            image: null,
            isActive: true,
        })

        await expect(requireSession()).resolves.toBe("user-1")
        await expect(getActiveSessionUser()).resolves.toMatchObject({ id: "user-1", role: "visitor" })
    })

    it("blocks inactive users", async () => {
        mocks.getServerSession.mockResolvedValue({ user: { id: "user-2" } })
        mocks.findUnique.mockResolvedValue({
            id: "user-2",
            role: "visitor",
            name: "Inactive User",
            email: "inactive@example.com",
            image: null,
            isActive: false,
        })

        await expect(getActiveSessionUser()).resolves.toBeNull()
        await expect(requireActiveSessionUser()).rejects.toThrow("Hiteles")
    })

    it("blocks sessions for users missing from the database", async () => {
        mocks.getServerSession.mockResolvedValue({ user: { id: "deleted-user" } })
        mocks.findUnique.mockResolvedValue(null)

        await expect(getActiveSessionUser()).resolves.toBeNull()
        await expect(requireSession()).rejects.toThrow("Hiteles")
    })

    it("allows active admins through the admin helper", async () => {
        mocks.getServerSession.mockResolvedValue({ user: { id: "admin-1" } })
        mocks.findUnique.mockResolvedValue({
            id: "admin-1",
            role: "admin",
            name: "Admin",
            email: "admin@example.com",
            image: null,
            isActive: true,
        })

        await expect(requireAdminSession()).resolves.toMatchObject({ id: "admin-1", role: "admin" })
    })

    it("blocks inactive admins in the admin helper", async () => {
        mocks.getServerSession.mockResolvedValue({ user: { id: "admin-2" } })
        mocks.findUnique.mockResolvedValue({
            id: "admin-2",
            role: "admin",
            name: "Inactive Admin",
            email: "inactive-admin@example.com",
            image: null,
            isActive: false,
        })

        await expect(requireAdminSession()).rejects.toThrow("Hiteles")
    })
})
