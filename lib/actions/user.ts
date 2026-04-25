"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { requireSession } from "@/lib/auth-utils"
import bcrypt from "bcryptjs"

async function isAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user) return false
    
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })
    
    return user?.role === "admin"
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

export async function changePassword(userId: string, data: { currentPassword: string, newPassword: string }) {
    const sessionUserId = await requireSession()
    if (sessionUserId !== userId) {
        throw new Error("Nincs jogosultságod ezt a jelszót módosítani.")
    }

    const currentPassword = data.currentPassword?.trim()
    const newPassword = data.newPassword?.trim()

    if (!currentPassword || !newPassword) {
        return { success: false, error: "A jelszó módosításához tölts ki minden mezőt." }
    }

    if (newPassword.length < 8) {
        return { success: false, error: "Az új jelszónak legalább 8 karakter hosszúnak kell lennie." }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        })

        if (!user?.password) {
            return { success: false, error: "Ehhez a fiókhoz jelenleg nem érhető el a jelszó módosítása." }
        }

        const isValid = await bcrypt.compare(currentPassword, user.password)
        if (!isValid) {
            return { success: false, error: "A jelenlegi jelszó nem megfelelő." }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })

        return { success: true }
    } catch (error) {
        console.error("Error changing password:", error)
        return { success: false, error: "Nem sikerült a jelszó frissítése." }
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
                data: { isActive: false, inactivatedAt: now }
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
                data: { isActive: true, inactivatedAt: null }
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
        return { success: true }
    } catch (error) {
        console.error("Error restoring account:", error)
        return { success: false, error: "Nem sikerült a fiók visszaállítása." }
    }
}

export async function getAllUsers() {
    if (!(await isAdmin())) {
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
    if (!(await isAdmin())) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
            }
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
    if (!(await isAdmin())) {
        return { success: false, error: "Unauthorized" }
    }

    try {
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
    if (!(await isAdmin())) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true }
        })

        if (!user) return { success: false, error: "Felhasználó nem található." }

        const now = new Date()
        if (user.isActive) {
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { isActive: false, inactivatedAt: now }
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
                    data: { isActive: true, inactivatedAt: null }
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

        revalidatePath("/dashboard/admin/visitors")
        revalidatePath("/dashboard/admin/providers")
        return { success: true, isActive: !user.isActive }
    } catch (error) {
        console.error("Error toggling user active status:", error)
        return { success: false, error: "Nem sikerült a fiók státuszának módosítása." }
    }
}

export async function toggleUserRole(userId: string) {
    if (!(await isAdmin())) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        })

        if (!user) return { success: false, error: "Felhasználó nem található." }

        const newRole = user.role === "visitor" ? "provider" : "visitor"

        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        })

        revalidatePath("/dashboard/admin/visitors")
        revalidatePath("/dashboard/admin/providers")
        return { success: true, newRole }
    } catch (error) {
        console.error("Error toggling user role:", error)
        return { success: false, error: "Nem sikerült a szerepkör módosítása." }
    }
}
