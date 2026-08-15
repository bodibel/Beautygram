"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import { requireAdminSession, requireSession } from "@/lib/auth-utils"
import {
    canDeactivateAdminUser,
    canDeleteAdminUser,
    canRemoveAdminRole,
    isUserRole,
} from "@/lib/auth/role-policy"

async function requireAdmin() {
    try {
        const user = await requireAdminSession()
        return user.id
    } catch {
        return null
    }
}

async function getAdminCount() {
    return prisma.user.count({ where: { role: "admin" } })
}

async function getActiveAdminCount() {
    return prisma.user.count({ where: { role: "admin", isActive: true } })
}

export async function updateProfile(userId: string, data: { name?: string }) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) {
        throw new Error("Nincs jogosultságod ezt a profilt módosítani.")
    }
    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
            }
        })
        revalidatePath("/")
        return { success: true, user }
    } catch (error) {
        console.error("Error updating profile:", error)
        return { success: false, error: "Nem sikerült a profil frissítése." }
    }
}

export async function inactivateAccount(userId: string) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) {
        throw new Error("Nincs jogosultságod ezt a fiókot inaktiválni.")
    }
    try {
        const now = new Date()
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: false, inactivatedAt: now, deactivatedBy: "self" }
            })
            await tx.salon.updateMany({
                where: { ownerId: userId, isActive: true },
                data: { isActive: false, inactivatedAt: now }
            })
            const salons = await tx.salon.findMany({
                where: { ownerId: userId },
                select: { id: true }
            })
            const salonIds = salons.map(s => s.id)
            if (salonIds.length > 0) {
                await tx.post.updateMany({
                    where: { salonId: { in: salonIds } },
                    data: { isActive: false, inactivatedAt: now }
                })
            }
        })
        await writeAuditLog({
            action: AUDIT_ACTIONS.ACCOUNT_SELF_DEACTIVATE,
            userId,
            entity: "User",
            entityId: userId,
            ...(await getAuditActionContext()),
        })
        return { success: true }
    } catch (error) {
        console.error("Error inactivating account:", error)
        return { success: false, error: "Nem sikerült a fiók inaktiválása." }
    }
}

export async function restoreAccount(userId: string) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) {
        throw new Error("Nincs jogosultságod ezt a fiókot visszaállítani.")
    }
    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: true, inactivatedAt: null, deactivatedBy: null }
            })
            await tx.salon.updateMany({
                where: { ownerId: userId, inactivatedAt: { not: null } },
                data: { isActive: true, inactivatedAt: null }
            })
            const salons = await tx.salon.findMany({
                where: { ownerId: userId },
                select: { id: true }
            })
            const salonIds = salons.map(s => s.id)
            if (salonIds.length > 0) {
                await tx.post.updateMany({
                    where: { salonId: { in: salonIds }, inactivatedAt: { not: null } },
                    data: { isActive: true, inactivatedAt: null }
                })
            }
        })
        await writeAuditLog({
            action: AUDIT_ACTIONS.ACCOUNT_SELF_RESTORE,
            userId,
            entity: "User",
            entityId: userId,
            ...(await getAuditActionContext()),
        })
        return { success: true }
    } catch (error) {
        console.error("Error restoring account:", error)
        return { success: false, error: "Nem sikerült a fiók visszaállítása." }
    }
}

export async function getAllUsers() {
    if (!(await requireAdmin())) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { id: 'desc' },
            include: {
                salons: {
                    select: { id: true, name: true }
                }
            }
        })
        return { success: true, users }
    } catch (error) {
        console.error("Error fetching users:", error)
        return { success: false, error: "Nem sikerült a felhasználók lekérése." }
    }
}

export async function updateUserAdmin(userId: string, data: { name?: string, email?: string, role?: string }) {
    const currentAdminId = await requireAdmin()
    if (!currentAdminId) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        })

        if (!existingUser) return { success: false, error: "Felhasználó nem található." }

        if (data.role !== undefined && !isUserRole(data.role)) {
            return { success: false, error: "Érvénytelen szerepkör." }
        }

        if (existingUser.role === "admin" && data.role !== undefined && data.role !== "admin") {
            const removalCheck = canRemoveAdminRole({
                targetUserId: userId,
                currentAdminId,
                adminCount: await getAdminCount(),
            })
            if (!removalCheck.allowed) return { success: false, error: removalCheck.error }
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
            }
        })
        await writeAuditLog({
            action: data.role !== undefined && data.role !== existingUser.role
                ? AUDIT_ACTIONS.ADMIN_USER_ROLE_CHANGE
                : AUDIT_ACTIONS.ADMIN_USER_UPDATE,
            userId: currentAdminId,
            entity: "User",
            entityId: userId,
            metadata: {
                previousRole: existingUser.role,
                newRole: data.role ?? existingUser.role,
                changedFields: Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined),
            },
            ...(await getAuditActionContext()),
        })
        revalidatePath("/dashboard/admin/visitors")
        revalidatePath("/dashboard/admin/providers")
        return { success: true, user }
    } catch (error) {
        console.error("Error updating user admin:", error)
        return { success: false, error: "Nem sikerült a felhasználó frissítése." }
    }
}

export async function deleteUserAdmin(userId: string) {
    const currentAdminId = await requireAdmin()
    if (!currentAdminId) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, email: true }
        })

        if (!user) return { success: false, error: "Felhasználó nem található." }

        const deleteCheck = canDeleteAdminUser({
            targetUserId: userId,
            currentAdminId,
            targetRole: user.role,
            adminCount: await getAdminCount(),
        })
        if (!deleteCheck.allowed) return { success: false, error: deleteCheck.error }

        // A naplóbejegyzés a törlés ELŐTT készül, mert az AuditLog.userId
        // SetNull kapcsolatban áll a User-rel, és a törölt fiók adatait meg akarjuk őrizni.
        await writeAuditLog({
            action: AUDIT_ACTIONS.ADMIN_USER_DELETE,
            userId: currentAdminId,
            entity: "User",
            entityId: userId,
            metadata: { deletedUserRole: user.role, deletedUserEmail: user.email },
            ...(await getAuditActionContext()),
        })

        await prisma.user.delete({
            where: { id: userId }
        })
        revalidatePath("/dashboard/admin/visitors")
        revalidatePath("/dashboard/admin/providers")
        return { success: true }
    } catch (error) {
        console.error("Error deleting user:", error)
        return { success: false, error: "Nem sikerült a felhasználó törlése." }
    }
}

export async function toggleUserActiveAdmin(userId: string) {
    const currentAdminId = await requireAdmin()
    if (!currentAdminId) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true, role: true }
        })

        if (!user) return { success: false, error: "Felhasználó nem található." }

        const now = new Date()
        if (user.isActive) {
            const deactivateCheck = canDeactivateAdminUser({
                targetUserId: userId,
                currentAdminId,
                targetRole: user.role,
                isTargetActive: user.isActive,
                activeAdminCount: await getActiveAdminCount(),
            })
            if (!deactivateCheck.allowed) return { success: false, error: deactivateCheck.error }

            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { isActive: false, inactivatedAt: now, deactivatedBy: "admin" }
                })
                await tx.salon.updateMany({
                    where: { ownerId: userId, isActive: true },
                    data: { isActive: false, inactivatedAt: now }
                })
                const salons = await tx.salon.findMany({
                    where: { ownerId: userId },
                    select: { id: true }
                })
                const salonIds = salons.map(s => s.id)
                if (salonIds.length > 0) {
                    await tx.post.updateMany({
                        where: { salonId: { in: salonIds } },
                        data: { isActive: false, inactivatedAt: now }
                    })
                }
            })
        } else {
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { isActive: true, inactivatedAt: null, deactivatedBy: null }
                })
                await tx.salon.updateMany({
                    where: { ownerId: userId, inactivatedAt: { not: null } },
                    data: { isActive: true, inactivatedAt: null }
                })
                const salons = await tx.salon.findMany({
                    where: { ownerId: userId },
                    select: { id: true }
                })
                const salonIds = salons.map(s => s.id)
                if (salonIds.length > 0) {
                    await tx.post.updateMany({
                        where: { salonId: { in: salonIds }, inactivatedAt: { not: null } },
                        data: { isActive: true, inactivatedAt: null }
                    })
                }
            })
        }

        await writeAuditLog({
            action: user.isActive ? AUDIT_ACTIONS.ADMIN_USER_DEACTIVATE : AUDIT_ACTIONS.ADMIN_USER_ACTIVATE,
            userId: currentAdminId,
            entity: "User",
            entityId: userId,
            metadata: { targetRole: user.role, newIsActive: !user.isActive },
            ...(await getAuditActionContext()),
        })

        revalidatePath("/dashboard/admin/visitors")
        revalidatePath("/dashboard/admin/providers")
        return { success: true, isActive: !user.isActive }
    } catch (error) {
        console.error("Error toggling user active status:", error)
        return { success: false, error: "Nem sikerült a fiók státuszának módosítása." }
    }
}

export async function toggleUserRole(userId: string) {
    const currentAdminId = await requireAdmin()
    if (!currentAdminId) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        })

        if (!user) return { success: false, error: "Felhasználó nem található." }

        if (user.role === "admin") {
            return { success: false, error: "Admin szerepkör nem módosítható ezzel a gyors művelettel." }
        }

        const newRole = user.role === "visitor" ? "provider" : "visitor"

        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        })

        await writeAuditLog({
            action: AUDIT_ACTIONS.ADMIN_USER_ROLE_CHANGE,
            userId: currentAdminId,
            entity: "User",
            entityId: userId,
            metadata: { previousRole: user.role, newRole },
            ...(await getAuditActionContext()),
        })

        revalidatePath("/dashboard/admin/visitors")
        revalidatePath("/dashboard/admin/providers")
        return { success: true, newRole }
    } catch (error) {
        console.error("Error toggling user role:", error)
        return { success: false, error: "Nem sikerült a szerepkör módosítása." }
    }
}
