import { describe, expect, it } from "vitest"

import {
    canDeactivateAdminUser,
    canDeleteAdminUser,
    canRemoveAdminRole,
    isPublicRegistrationRole,
    isUserRole,
} from "../../lib/auth/role-policy"

describe("authorization role policy", () => {
    it("allows only visitor and provider for public registration", () => {
        expect(isPublicRegistrationRole("visitor")).toBe(true)
        expect(isPublicRegistrationRole("provider")).toBe(true)
        expect(isPublicRegistrationRole("admin")).toBe(false)
        expect(isPublicRegistrationRole("owner")).toBe(false)
    })

    it("allows only known user roles for admin mutations", () => {
        expect(isUserRole("visitor")).toBe(true)
        expect(isUserRole("provider")).toBe(true)
        expect(isUserRole("admin")).toBe(true)
        expect(isUserRole("superadmin")).toBe(false)
    })

    it("blocks an admin from removing their own admin role", () => {
        const result = canRemoveAdminRole({
            targetUserId: "admin-1",
            currentAdminId: "admin-1",
            adminCount: 2,
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("blocks removing the last admin role", () => {
        const result = canRemoveAdminRole({
            targetUserId: "admin-2",
            currentAdminId: "admin-1",
            adminCount: 1,
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("blocks an admin from deleting themselves", () => {
        const result = canDeleteAdminUser({
            targetUserId: "admin-1",
            currentAdminId: "admin-1",
            targetRole: "admin",
            adminCount: 2,
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("blocks deleting the last admin account", () => {
        const result = canDeleteAdminUser({
            targetUserId: "admin-2",
            currentAdminId: "admin-1",
            targetRole: "admin",
            adminCount: 1,
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("blocks an admin from deactivating themselves", () => {
        const result = canDeactivateAdminUser({
            targetUserId: "admin-1",
            currentAdminId: "admin-1",
            targetRole: "admin",
            isTargetActive: true,
            activeAdminCount: 2,
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("blocks deactivating the last active admin", () => {
        const result = canDeactivateAdminUser({
            targetUserId: "admin-2",
            currentAdminId: "admin-1",
            targetRole: "admin",
            isTargetActive: true,
            activeAdminCount: 1,
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })
})
