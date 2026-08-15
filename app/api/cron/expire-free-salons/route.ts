/**
 * Cron endpoint: lejárt FREE szalonok publikálásának letiltása
 *
 * Hívás: GET /api/cron/expire-free-salons
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Éles környezetben naponta egyszer hívjuk (pl. Vercel Cron, vagy VPS cron job):
 *   0 3 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/expire-free-salons
 */

import { NextRequest, NextResponse } from "next/server"
import { expireFreeSalons } from "@/lib/subscription"

export async function GET(req: NextRequest) {
  // Biztonsági ellenőrzés: csak érvényes CRON_SECRET-tel hívható.
  // Fail-closed: ha a titok nincs beállítva, a végpont nem hívható.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")

  if (!cronSecret) {
    console.error("[cron] expire-free-salons: CRON_SECRET nincs beállítva, a hívás elutasítva")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const count = await expireFreeSalons()
    console.log(`[cron] expire-free-salons: ${count} szalon publikálása letiltva`)
    return NextResponse.json({
      success: true,
      blocked: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[cron] expire-free-salons hiba:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
