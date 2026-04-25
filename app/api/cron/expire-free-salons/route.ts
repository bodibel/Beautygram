/**
 * Cron endpoint: lejárt FREE szalonok inaktiválása
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
  // Biztonsági ellenőrzés: csak érvényes CRON_SECRET-tel hívható
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")

  if (!cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const count = await expireFreeSalons()
    console.log(`[cron] expire-free-salons: ${count} szalon inaktiválva`)
    return NextResponse.json({
      success: true,
      inactivated: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[cron] expire-free-salons hiba:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
