/**
 * Cron endpoint: 3 napos előfizetés-lejárat emlékeztető emailek
 *
 * Hívás: GET /api/cron/subscription-reminders
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * VPS cron: 0 9 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://domain.com/api/cron/subscription-reminders
 */

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client"
import { sendSubscriptionExpiryWarning } from "@/lib/mail"
import { getSubscriptionConfig } from "@/lib/subscription"

export async function GET(req: NextRequest) {
  // Fail-closed: ha a titok nincs beállítva, a végpont nem hívható.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")

  if (!cronSecret) {
    console.error("[cron] subscription-reminders: CRON_SECRET nincs beállítva, a hívás elutasítva")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. fázis: a lejáratás ki van kapcsolva, tehát a figyelmeztetés félrevezető lenne.
    const config = await getSubscriptionConfig()
    if (!config.billingEnabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "A számlázás ki van kapcsolva.",
        timestamp: new Date().toISOString(),
      })
    }

    const now = new Date()
    // 3 nap múlva lejáró időszak: most + 3 nap ± 12 óra ablakban
    const windowStart = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000)
    const windowEnd   = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000)

    // FREE szalonok: freeExpiresAt alapján
    const expiringFree = await prisma.subscription.findMany({
      where: {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        freeExpiresAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        salon: {
          select: { id: true, name: true, email: true, owner: { select: { email: true } } }
        }
      }
    })

    // Fizetős szalonok (STANDARD/PREMIUM): currentPeriodEnd alapján
    const expiringPaid = await prisma.subscription.findMany({
      where: {
        plan: { in: [SubscriptionPlan.STANDARD, SubscriptionPlan.PREMIUM] },
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: true, // csak azoknak, akik lemondták
        currentPeriodEnd: { gte: windowStart, lte: windowEnd },
      },
      include: {
        salon: {
          select: { id: true, name: true, email: true, owner: { select: { email: true } } }
        }
      }
    })

    const allExpiring = [...expiringFree, ...expiringPaid]
    let sent = 0

    for (const sub of allExpiring) {
      const expiresAt = sub.plan === SubscriptionPlan.FREE
        ? sub.freeExpiresAt!
        : sub.currentPeriodEnd!

      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Email küldés: szalon saját emailje, ha nincs, akkor a tulajdonos emailje
      const recipientEmail = sub.salon.email || sub.salon.owner?.email
      if (!recipientEmail) continue

      try {
        await sendSubscriptionExpiryWarning(
          recipientEmail,
          sub.salon.name,
          expiresAt,
          sub.plan,
          daysLeft
        )
        sent++
      } catch (emailError) {
        console.error(`[cron] Email küldési hiba (${sub.salon.name}):`, emailError)
      }
    }

    console.log(`[cron] subscription-reminders: ${sent}/${allExpiring.length} email elküldve`)
    return NextResponse.json({
      success: true,
      checked: allExpiring.length,
      sent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[cron] subscription-reminders hiba:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
