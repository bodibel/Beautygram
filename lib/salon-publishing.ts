import prisma from "@/lib/db"
import { getSubscriptionConfig } from "@/lib/subscription"

/**
 * A publikálási házirend — a fizetős fázisok vezérlője.
 *
 * A termék három fázisa a SubscriptionConfig négy mezőjével kapcsolható:
 *   billingEnabled     — amíg false, minden szalon ingyenesen publikálható (1. fázis)
 *   freeSalonSlots     — szolgáltatónként ennyi szalon publikálható ingyen
 *   freeSlotTrialDays  — meddig tart az ingyenes hely (0 = korlátlan ideig)
 *   gracePeriodDays    — türelmi idő a szabály szigorításakor
 */

export type PublishPolicyResult = {
    allowed: boolean
    reason?: string
}

export type QuotaStatus = {
    billingEnabled: boolean
    freeSlots: number
    usedSlots: number
    inGracePeriod: boolean
    graceEndsAt: Date | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Van-e a szalonnak érvényes fizetett előfizetése?
 *
 * EZ A FIZETÉSI SZOLGÁLTATÓ BEILLESZTÉSI PONTJA. Jelenleg csak a Subscription
 * rekord plan/status mezőiből dönt, tehát fizetési folyamat híján gyakorlatilag
 * mindig hamis. Amikor a fizetés bekerül, elég ezt az egy függvényt átírni —
 * a házirend és minden hívási hely változatlan marad.
 */
export async function hasActivePaidSubscription(salonId: string): Promise<boolean> {
    const sub = await prisma.subscription.findUnique({
        where: { salonId },
        select: { plan: true, status: true },
    })
    return Boolean(sub && sub.plan !== "FREE" && sub.status === "ACTIVE")
}

/** Mikor jár le a türelmi idő? `null`, ha nincs folyamatban. */
function graceEnd(config: { billingEnabledAt: Date | null; gracePeriodDays: number }): Date | null {
    if (!config.billingEnabledAt) return null
    return new Date(config.billingEnabledAt.getTime() + config.gracePeriodDays * MS_PER_DAY)
}

/**
 * Hány ingyenes helyet foglal el jelenleg a szolgáltató?
 * A fizetett szalonok nem számítanak bele, mert nem az ingyenes keretet fogyasztják.
 */
async function countFreePublishedSalons(ownerId: string, excludeSalonId?: string): Promise<number> {
    return prisma.salon.count({
        where: {
            ownerId,
            isPublished: true,
            publishBlockedReason: null,
            ...(excludeSalonId ? { id: { not: excludeSalonId } } : {}),
            // A `subscription` egy-az-egyhez kapcsolat, ezért a hiányát az
            // `is: null` alakkal kell szűrni, nem `subscription: null`-lal.
            OR: [
                { subscription: { is: null } },
                { subscription: { plan: "FREE" } },
                { subscription: { status: { not: "ACTIVE" } } },
            ],
        },
    })
}

/**
 * Publikálhatja-e a megadott tulajdonos a szalonját?
 *
 * @param ownerId A szalon tulajdonosának azonosítója.
 * @param salonId A publikálandó szalon azonosítója. Újonnan létrehozott szalonnál
 *   elhagyható. Megadva a szalon nem számít bele a saját kvóta-ellenőrzésébe,
 *   így az újrapublikálás nem foglal új helyet.
 */
export async function canPublishSalon(
    ownerId: string,
    salonId?: string
): Promise<PublishPolicyResult> {
    let config
    try {
        config = await getSubscriptionConfig()
    } catch (error) {
        // Megengedő alapértelmezés: egy konfigurációs hiba miatt fizetőfal mögé
        // zárni az ügyfeleket rosszabb kimenet, mint átmenetileg többet engedni.
        console.error("Publikálási házirend: a konfiguráció nem olvasható:", error)
        return { allowed: true }
    }

    // 1. fázis: minden szalon ingyenesen publikálható.
    if (!config.billingEnabled) {
        return { allowed: true }
    }

    // Türelmi idő: a szabály szigorítása után mindenki kap időt a rendezésre.
    const graceEndsAt = graceEnd(config)
    if (graceEndsAt && Date.now() < graceEndsAt.getTime()) {
        return { allowed: true }
    }

    // Fizetett szalon mindig publikálható, a keret nem vonatkozik rá.
    if (salonId && await hasActivePaidSubscription(salonId)) {
        return { allowed: true }
    }

    const usedSlots = await countFreePublishedSalons(ownerId, salonId)
    if (usedSlots >= config.freeSalonSlots) {
        return {
            allowed: false,
            reason: `Elérted az ingyenesen publikálható szalonok számát (${config.freeSalonSlots}). `
                + "A további szalonok publikálásához előbb vegyél le egy másikat.",
        }
    }

    // 3. fázis: az ingyenes hely is lejárhat.
    if (config.freeSlotTrialDays > 0 && salonId) {
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { publishedAt: true },
        })
        if (salon?.publishedAt) {
            const ageInDays = (Date.now() - salon.publishedAt.getTime()) / MS_PER_DAY
            if (ageInDays > config.freeSlotTrialDays) {
                return {
                    allowed: false,
                    reason: `Az ingyenes publikálási időszak (${config.freeSlotTrialDays} nap) lejárt ennél a szalonnál.`,
                }
            }
        }
    }

    return { allowed: true }
}

/**
 * A szolgáltató kvóta-állapota a felület számára.
 * Hiba esetén dob — a hívó felület ilyenkor elrejti a jelzést,
 * hogy soha ne mutasson pontatlan keretet.
 */
export async function getSalonQuotaStatus(ownerId: string): Promise<QuotaStatus> {
    const config = await getSubscriptionConfig()
    const graceEndsAt = graceEnd(config)
    const inGracePeriod = Boolean(
        config.billingEnabled && graceEndsAt && Date.now() < graceEndsAt.getTime()
    )

    return {
        billingEnabled: config.billingEnabled,
        freeSlots: config.freeSalonSlots,
        usedSlots: await countFreePublishedSalons(ownerId),
        inGracePeriod,
        graceEndsAt: config.billingEnabled ? graceEndsAt : null,
    }
}
