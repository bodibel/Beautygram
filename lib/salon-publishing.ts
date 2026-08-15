import { getSubscriptionConfig } from "@/lib/subscription"

/**
 * A publikálási házirend — a fizetős fázisok varrata.
 *
 * Az 1. fázisban (billingEnabled=false) minden publikálás engedélyezett.
 * A 2. fázisban itt fog megjelenni az ingyenes szalonhelyek kvótája, a hívási
 * helyek (createSalon, publishSalon) módosítása nélkül.
 */

export type PublishPolicyResult = {
    allowed: boolean
    reason?: string
}

/**
 * Publikálhatja-e a megadott tulajdonos a szalonját?
 *
 * @param ownerId A szalon tulajdonosának azonosítója.
 * @param salonId A publikálandó szalon azonosítója. Újonnan létrehozott
 *   szalonnál elhagyható. A kvóta-számoláshoz lesz szükséges a 2. fázisban,
 *   hogy a már publikált szalon újrapublikálása ne számítson új helynek.
 */
export async function canPublishSalon(
    ownerId: string,
    salonId?: string
): Promise<PublishPolicyResult> {
    const config = await getSubscriptionConfig()

    // 1. fázis: minden szalon ingyenesen publikálható.
    if (!config.billingEnabled) {
        return { allowed: true }
    }

    // 2. fázis: ide kerül az ingyenes szalonhelyek kvótája.
    // A kvóta-házirend külön csomag (C), addig a kapcsoló bekapcsolása
    // sem korlátozza a publikálást.
    void ownerId
    void salonId
    return { allowed: true }
}
