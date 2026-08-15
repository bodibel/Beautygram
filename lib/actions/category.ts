"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import { requireAdminSession } from "@/lib/auth-utils"

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

async function requireAdmin() {
    const admin = await requireAdminSession()
    return admin.id
}

export async function getCategories(all?: boolean) {
    try {
        const categories = await prisma.category.findMany({
            where: all ? {} : { isActive: true },
            orderBy: { order: 'asc' }
        })
        return categories
    } catch (error) {
        console.error("Error fetching categories:", error)
        return []
    }
}

export async function createCategory(data: { name: string; slug: string; icon?: string; order?: number }) {
    const adminId = await requireAdmin()
    try {
        const category = await prisma.category.create({
            data: {
                name: data.name,
                slug: data.slug,
                icon: data.icon,
                order: data.order || 0,
                isActive: true
            }
        })
        await writeAuditLog({
            action: AUDIT_ACTIONS.ADMIN_CATEGORY_CREATE,
            userId: adminId,
            entity: "Category",
            entityId: category.id,
            metadata: { name: category.name, slug: category.slug },
            ...(await getAuditActionContext()),
        })
        revalidatePath("/")
        revalidatePath("/dashboard/admin/settings")
        return { success: true, category }
    } catch (error) {
        console.error("Error creating category:", error)
        return { success: false, error: getErrorMessage(error, "Failed to create category") }
    }
}

export async function updateCategory(id: string, data: { name?: string; slug?: string; icon?: string; order?: number; isActive?: boolean }) {
    const adminId = await requireAdmin()
    try {
        const category = await prisma.category.update({
            where: { id },
            data
        })
        await writeAuditLog({
            action: AUDIT_ACTIONS.ADMIN_CATEGORY_UPDATE,
            userId: adminId,
            entity: "Category",
            entityId: category.id,
            metadata: { changedFields: Object.keys(data) },
            ...(await getAuditActionContext()),
        })
        revalidatePath("/")
        revalidatePath("/dashboard/admin/settings")
        return { success: true, category }
    } catch (error) {
        console.error("Error updating category:", error)
        return { success: false, error: getErrorMessage(error, "Failed to update category") }
    }
}

export async function deleteCategory(id: string) {
    const adminId = await requireAdmin()
    try {
        // We could either delete or just inactivate.
        // Let's check if it's used first? Usually it's safer to just inactivate.
        const category = await prisma.category.update({
            where: { id },
            data: { isActive: false }
        })
        await writeAuditLog({
            action: AUDIT_ACTIONS.ADMIN_CATEGORY_DELETE,
            userId: adminId,
            entity: "Category",
            entityId: category.id,
            metadata: { name: category.name, slug: category.slug },
            ...(await getAuditActionContext()),
        })
        revalidatePath("/")
        revalidatePath("/dashboard/admin/settings")
        return { success: true, category }
    } catch (error) {
        console.error("Error deleting category:", error)
        return { success: false, error: getErrorMessage(error, "Failed to delete category") }
    }
}
