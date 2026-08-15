/**
 * Subscription helper függvények
 * - Fingerprint generálás és duplikáció ellenőrzés
 * - Plan korlátok ellenőrzése (poszt limit, videó feltöltés)
 * - Subscription inicializálás
 * - Config lekérdezés (admin által állítható)
 */

import { createHash } from "crypto"
import prisma from "@/lib/db"
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client"

// ─── Config ──────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG = {
  freeTrialDays: 60,       // 2 hónap
  freeMonthlyPostLimit: 5, // 5 poszt / 30 nap
  billingEnabled: false,   // 1. fázis: minden ingyenes, semmi nem jár le
}

/** Admin által beállított konfiguráció, fallback a DEFAULT_CONFIG értékeire */
export async function getSubscriptionConfig() {
  const config = await prisma.subscriptionConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  })
  return {
    freeTrialDays: config?.freeTrialDays ?? DEFAULT_CONFIG.freeTrialDays,
    freeMonthlyPostLimit: config?.freeMonthlyPostLimit ?? DEFAULT_CONFIG.freeMonthlyPostLimit,
    billingEnabled: config?.billingEnabled ?? DEFAULT_CONFIG.billingEnabled,
    stripePublishableKey: config?.stripePublishableKey ?? null,
    stripeSecretKey: config?.stripeSecretKey ?? null,
    stripeWebhookSecret: config?.stripeWebhookSecret ?? null,
    standardPriceHufId: config?.standardPriceHufId ?? null,
    standardPriceEurId: config?.standardPriceEurId ?? null,
    premiumPriceHufId: config?.premiumPriceHufId ?? null,
    premiumPriceEurId: config?.premiumPriceEurId ?? null,
  }
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────

/** Normalizálja a telefonszámot: csak számjegyeket tart meg */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  return phone.replace(/\D/g, "")
}

/**
 * Normalizálja a címet: kisbetű, ékezetek eltávolítása, speciális karakterek kihagyása.
 * Pl: "Budapest, Váci út 1-3" → "budapest vaci ut 13"
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ékezetek
    .replace(/[^a-z0-9\s]/g, "")     // csak alfanumerikus + szóköz
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * SHA-256 hash a normalizált telefon + cím kombinációból.
 * Ha nincs telefon, csak az address alapján hash-elünk.
 */
export function generateSalonFingerprint(
  phone: string | null | undefined,
  address: string
): string {
  const normalizedPhone = normalizePhone(phone)
  const normalizedAddress = normalizeAddress(address)
  const raw = `${normalizedPhone}|${normalizedAddress}`
  return createHash("sha256").update(raw).digest("hex")
}

/**
 * Ellenőrzi, hogy létezik-e már szalon ezzel a fingerprinttel (aktív VAGY inaktív).
 * Ha igen, visszaadja az ütköző szalon nevét és státuszát.
 */
export async function checkFingerprintDuplicate(
  fingerprint: string,
  excludeSalonId?: string
): Promise<{ duplicate: boolean; salonName?: string; isInactive?: boolean }> {
  const existing = await prisma.salon.findUnique({
    where: { salonFingerprint: fingerprint },
    select: { id: true, name: true, isActive: true },
  })

  if (!existing) return { duplicate: false }
  if (excludeSalonId && existing.id === excludeSalonId) return { duplicate: false }

  return {
    duplicate: true,
    salonName: existing.name,
    isInactive: !existing.isActive,
  }
}

// ─── Subscription inicializálás ───────────────────────────────────────────────

/**
 * Új szalon létrehozásakor automatikusan létrehozza a FREE Subscription rekordot.
 * freeExpiresAt = most + freeTrialDays nap
 */
export async function initSubscription(
  salonId: string,
  billingCurrency: "HUF" | "EUR" = "HUF"
): Promise<void> {
  const config = await getSubscriptionConfig()
  const now = new Date()
  const freeExpiresAt = new Date(now)
  freeExpiresAt.setDate(freeExpiresAt.getDate() + config.freeTrialDays)

  await prisma.subscription.create({
    data: {
      salonId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      billingCurrency,
      freeStartedAt: now,
      freeExpiresAt,
      postWindowStart: now,
      postCountInWindow: 0,
    },
  })
}

// ─── Plan ellenőrzések ────────────────────────────────────────────────────────

/**
 * Lekérdezi a szalon aktuális előfizetését.
 * Ha nincs Subscription rekord (régi szalon), FREE-ként kezeli.
 */
export async function getSalonSubscription(salonId: string) {
  return await prisma.subscription.findUnique({
    where: { salonId },
  })
}

/**
 * Ellenőrzi, hogy a szalon létrehozhat-e új posztot.
 * - ACTIVE státusz szükséges
 * - FREE csomagnál: 30 napos ablakban max freeMonthlyPostLimit poszt
 * - STANDARD/PREMIUM: korlátlan
 *
 * Visszatér: { allowed: boolean; reason?: string }
 */
export async function canCreatePost(salonId: string): Promise<{
  allowed: boolean
  reason?: string
  remainingPosts?: number
}> {
  const sub = await getSalonSubscription(salonId)

  // Ha nincs sub rekord, Free-ként kezeljük (régi szalon)
  if (!sub) {
    return { allowed: true } // backward compat
  }

  if (sub.status === SubscriptionStatus.INACTIVE) {
    return { allowed: false, reason: "Az előfizetés lejárt. Kérjük fizessen elő a folytatáshoz." }
  }

  if (sub.status === SubscriptionStatus.PAST_DUE) {
    return { allowed: false, reason: "A fizetés sikertelen. Kérjük frissítse a fizetési adatait." }
  }

  // STANDARD és PREMIUM: korlátlan
  if (sub.plan !== SubscriptionPlan.FREE) {
    return { allowed: true }
  }

  // FREE: 30 napos gördülő ablak ellenőrzés
  const config = await getSubscriptionConfig()
  const now = new Date()
  const windowStart = sub.postWindowStart
  const windowAgeMs = now.getTime() - windowStart.getTime()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  let currentCount = sub.postCountInWindow

  // Ha a 30 napos ablak lejárt, reseteljük
  if (windowAgeMs >= thirtyDaysMs) {
    await prisma.subscription.update({
      where: { salonId },
      data: {
        postWindowStart: now,
        postCountInWindow: 0,
      },
    })
    currentCount = 0
  }

  if (currentCount >= config.freeMonthlyPostLimit) {
    return {
      allowed: false,
      reason: `Az ingyenes csomagon havi ${config.freeMonthlyPostLimit} bejegyzés engedélyezett. Frissítsen Standard csomagra a korlátlan posztoláshoz.`,
      remainingPosts: 0,
    }
  }

  return {
    allowed: true,
    remainingPosts: config.freeMonthlyPostLimit - currentCount,
  }
}

/**
 * Poszt létrehozás után növeli a számlálót (csak FREE esetén).
 */
export async function incrementPostCount(salonId: string): Promise<void> {
  const sub = await getSalonSubscription(salonId)
  if (!sub || sub.plan !== SubscriptionPlan.FREE) return

  await prisma.subscription.update({
    where: { salonId },
    data: { postCountInWindow: { increment: 1 } },
  })
}

/**
 * Ellenőrzi, hogy a szalon tölthet-e fel videót (Standard+ szükséges).
 */
export async function canUploadVideo(salonId: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  const sub = await getSalonSubscription(salonId)

  if (!sub || sub.plan === SubscriptionPlan.FREE) {
    return {
      allowed: false,
      reason: "Videó feltöltés csak Standard vagy Prémium csomagban elérhető.",
    }
  }

  if (sub.status !== SubscriptionStatus.ACTIVE) {
    return { allowed: false, reason: "Az előfizetés nem aktív." }
  }

  return { allowed: true }
}

/**
 * Ellenőrzi, hogy a szalon időpontfoglalást fogadhat-e (Standard+ szükséges).
 */
export async function canUseBooking(salonId: string): Promise<boolean> {
  const sub = await getSalonSubscription(salonId)
  if (!sub) return false
  return (
    sub.plan !== SubscriptionPlan.FREE &&
    sub.status === SubscriptionStatus.ACTIVE
  )
}

/**
 * Ellenőrzi, hogy a szalon kiemelt megjelenítést kap-e (Premium szükséges).
 */
export async function isPremium(salonId: string): Promise<boolean> {
  const sub = await getSalonSubscription(salonId)
  if (!sub) return false
  return sub.plan === SubscriptionPlan.PREMIUM && sub.status === SubscriptionStatus.ACTIVE
}

// ─── Free lejárat kezelés ─────────────────────────────────────────────────────

/**
 * Lejárt FREE szalonok inaktiválása.
 * Ezt a cron job hívja naponta.
 * Visszaadja az inaktivált szalonok számát.
 */
export async function expireFreeSalons(): Promise<number> {
  const now = new Date()

  // Megkeressük a lejárt, még aktív FREE szalonokat
  const expired = await prisma.subscription.findMany({
    where: {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      freeExpiresAt: { lte: now },
    },
    select: { salonId: true },
  })

  if (expired.length === 0) return 0

  const salonIds = expired.map((s) => s.salonId)

  // Tranzakcióban inaktiváljuk a Subscription-t és a Salon-t
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { salonId: { in: salonIds } },
      data: { status: SubscriptionStatus.INACTIVE },
    }),
    prisma.salon.updateMany({
      where: { id: { in: salonIds } },
      data: { isActive: false, inactivatedAt: now },
    }),
  ])

  return expired.length
}
