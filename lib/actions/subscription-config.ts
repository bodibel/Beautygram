"use server"

import { revalidatePath } from "next/cache"

import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import { requireAdminSession } from "@/lib/auth-utils"
import prisma from "@/lib/db"

export type BillingConfigInput = {
    billingEnabled?: boolean
    freeSalonSlots?: number
    freeSlotTrialDays?: number
    gracePeriodDays?: number
}

export type BillingConfigView = {
    billingEnabled: boolean
    billingEnabledAt: Date | null
    freeSalonSlots: number
    freeSlotTrialDays: number
    gracePeriodDays: number
}

const NUMERIKUS_MEZOK = ["freeSalonSlots", "freeSlotTrialDays", "gracePeriodDays"] as const

/** A számlázási konfiguráció olvasása az admin felület számára. */
export async function getSubscriptionConfigAdmin(): Promise<{
    success: boolean
    config?: BillingConfigView
    error?: string
}> {
    await requireAdminSession()

    try {
        const config = await prisma.subscriptionConfig.findFirst({
            orderBy: { updatedAt: "desc" },
            select: {
                billingEnabled: true,
                billingEnabledAt: true,
                freeSalonSlots: true,
                freeSlotTrialDays: true,
                gracePeriodDays: true,
            },
        })

        return {
            success: true,
            config: config ?? {
                billingEnabled: false,
                billingEnabledAt: null,
                freeSalonSlots: 1,
                freeSlotTrialDays: 0,
                gracePeriodDays: 30,
            },
        }
    } catch (error) {
        console.error("Számlázási konfiguráció olvasási hiba:", error)
        return { success: false, error: "Nem sikerült a beállítások betöltése." }
    }
}

/**
 * A számlázási konfiguráció módosítása.
 *
 * A billingEnabled felfutó élén beállítja a billingEnabledAt értékét — ebből
 * számolódik a türelmi idő. Kikapcsoláskor nullázza, hogy egy későbbi
 * visszakapcsolás új türelmi időt indítson.
 */
export async function updateSubscriptionConfig(
    data: BillingConfigInput
): Promise<{ success: boolean; error?: string }> {
    const admin = await requireAdminSession()

    for (const mezo of NUMERIKUS_MEZOK) {
        const ertek = data[mezo]
        if (ertek !== undefined && (!Number.isInteger(ertek) || ertek < 0)) {
            return { success: false, error: "A számértékek csak nem negatív egész számok lehetnek." }
        }
    }

    try {
        const existing = await prisma.subscriptionConfig.findFirst({
            orderBy: { updatedAt: "desc" },
        })

        const updateData: Record<string, unknown> = { ...data }

        // A türelmi idő kezdete csak a kapcsoló állapotváltásakor íródik.
        // Ha már bekapcsolt állapotban módosítanak más mezőt, a billingEnabledAt
        // érintetlen marad — különben a türelmi idő minden mentéssel újraindulna.
        let turelmiIdoValtozott = false
        if (data.billingEnabled === true && !existing?.billingEnabled) {
            updateData.billingEnabledAt = new Date()
            turelmiIdoValtozott = true
        } else if (data.billingEnabled === false && existing?.billingEnabled) {
            updateData.billingEnabledAt = null
            turelmiIdoValtozott = true
        }

        if (existing) {
            await prisma.subscriptionConfig.update({
                where: { id: existing.id },
                data: { ...updateData, updatedBy: admin.id },
            })
        } else {
            await prisma.subscriptionConfig.create({
                data: { ...updateData, updatedBy: admin.id },
            })
        }

        await writeAuditLog({
            action: AUDIT_ACTIONS.ADMIN_BILLING_CONFIG_UPDATE,
            userId: admin.id,
            entity: "SubscriptionConfig",
            entityId: existing?.id ?? null,
            metadata: {
                elozo: {
                    billingEnabled: existing?.billingEnabled ?? null,
                    freeSalonSlots: existing?.freeSalonSlots ?? null,
                    freeSlotTrialDays: existing?.freeSlotTrialDays ?? null,
                    gracePeriodDays: existing?.gracePeriodDays ?? null,
                },
                // A metaadat csak JSON-biztos primitíveket tartalmazhat, ezért a
                // beküldött mezőket kifejezetten soroljuk fel, nem az update-objektumot
                // adjuk át (abban Date is lehet, amit a Prisma.InputJsonValue nem fogad el).
                uj: {
                    billingEnabled: data.billingEnabled ?? null,
                    freeSalonSlots: data.freeSalonSlots ?? null,
                    freeSlotTrialDays: data.freeSlotTrialDays ?? null,
                    gracePeriodDays: data.gracePeriodDays ?? null,
                },
                turelmiIdoUjraindult: turelmiIdoValtozott,
            },
            ...(await getAuditActionContext()),
        })

        revalidatePath("/dashboard/admin/settings")
        revalidatePath("/dashboard/salons")
        return { success: true }
    } catch (error) {
        console.error("Számlázási konfiguráció mentési hiba:", error)
        return { success: false, error: "Nem sikerült a beállítások mentése." }
    }
}
