import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit-log"
import prisma from "@/lib/db"
import { getSubscriptionConfig } from "@/lib/subscription"

const MS_PER_DAY = 24 * 60 * 60 * 1000

type PublishedSalon = {
    id: string
    ownerId: string
    publishedAt: Date | null
    subscription: { plan: string; status: string } | null
}

/** Fizetett szalon: mentesül a kvóta alól, és nem fogyasztja az ingyenes keretet. */
function isPaid(salon: PublishedSalon): boolean {
    return Boolean(
        salon.subscription
        && salon.subscription.plan !== "FREE"
        && salon.subscription.status === "ACTIVE"
    )
}

/**
 * Kvóta-érvényesítés: a keret feletti szalonokra publikálási tiltást ír.
 *
 * A tiltás a publishBlockedReason mezőbe kerül, SOHA nem az isPublished-be:
 * az a tulajdonos szándékának mezője, és annak pontosan egy írója van. Így a
 * szolgáltató látja, hogy nem ő vette le a szalont, és ha később fizet, a
 * szándéka érintetlenül visszaáll.
 *
 * Visszatér: a most letiltott szalonok száma.
 */
export async function enforcePublishingQuota(): Promise<number> {
    const config = await getSubscriptionConfig()

    // 1. fázis: nincs kvóta.
    if (!config.billingEnabled) return 0

    // Türelmi idő alatt még senkit nem tiltunk.
    if (config.billingEnabledAt) {
        const graceEndsAt = config.billingEnabledAt.getTime() + config.gracePeriodDays * MS_PER_DAY
        if (Date.now() < graceEndsAt) return 0
    }

    const published: PublishedSalon[] = await prisma.salon.findMany({
        where: { isPublished: true, publishBlockedReason: null },
        select: {
            id: true,
            ownerId: true,
            publishedAt: true,
            subscription: { select: { plan: true, status: true } },
        },
        orderBy: { publishedAt: "asc" },
    })

    const byOwner = new Map<string, PublishedSalon[]>()
    for (const salon of published) {
        const list = byOwner.get(salon.ownerId) ?? []
        list.push(salon)
        byOwner.set(salon.ownerId, list)
    }

    const toBlock: string[] = []
    const now = Date.now()

    for (const salons of byOwner.values()) {
        let freeSlotsUsed = 0

        for (const salon of salons) {
            // Fizetett szalon mindig marad, és nem fogyasztja a keretet.
            if (isPaid(salon)) continue

            if (freeSlotsUsed >= config.freeSalonSlots) {
                toBlock.push(salon.id)
                continue
            }

            // 3. fázis: az ingyenes hely is lejárhat.
            if (config.freeSlotTrialDays > 0 && salon.publishedAt) {
                const ageInDays = (now - salon.publishedAt.getTime()) / MS_PER_DAY
                if (ageInDays > config.freeSlotTrialDays) {
                    toBlock.push(salon.id)
                    continue
                }
            }

            freeSlotsUsed += 1
        }
    }

    if (toBlock.length === 0) return 0

    await prisma.salon.updateMany({
        where: { id: { in: toBlock } },
        data: { publishBlockedReason: "QUOTA", publishBlockedAt: new Date() },
    })

    // Szalononként külön bejegyzés, hogy az admin nézetben entityId szerint
    // vissza lehessen keresni, mikor és miért tiltódott egy konkrét szalon.
    for (const salonId of toBlock) {
        await writeAuditLog({
            action: AUDIT_ACTIONS.SALON_QUOTA_BLOCKED,
            entity: "Salon",
            entityId: salonId,
            metadata: { freeSalonSlots: config.freeSalonSlots },
        })
    }

    return toBlock.length
}
