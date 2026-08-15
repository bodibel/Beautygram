import type { Prisma } from "@prisma/client"

/**
 * A publikus szalon-láthatóság egyetlen igazságforrása.
 *
 * Három, egymástól független feltétel együttállása kell ahhoz, hogy egy szalon
 * látszódjon a látogatóknak. Minden feltételt más folyamat ír, ezért nem szabad
 * őket összevonni — pontosan ez az összemosás okozta korábban, hogy a fiók
 * visszaállítása feloldotta az előfizetés miatti tiltást is.
 */

export type SalonVisibilityFields = {
    isActive: boolean
    isPublished: boolean
    publishBlockedReason: string | null
}

/** Prisma where-töredék publikus szalon-lekérdezésekhez. */
export const PUBLIC_SALON_WHERE = {
    isActive: true,
    isPublished: true,
    publishBlockedReason: null,
} satisfies Prisma.SalonWhereInput

/**
 * Egy már betöltött szalon publikus láthatósága.
 * Fail-closed: minden feltételnek egyértelműen teljesülnie kell.
 */
export function isSalonPubliclyVisible(salon: SalonVisibilityFields): boolean {
    return salon.isActive === true
        && salon.isPublished === true
        && salon.publishBlockedReason === null
}
