/**
 * Cron endpoint: publikálási kvóta érvényesítése
 *
 * Hívás: GET /api/cron/enforce-publishing-quota
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * A keret feletti szalonokra publikálási tiltást ír. Kikapcsolt számlázásnál
 * és türelmi idő alatt nem csinál semmit.
 *
 * VPS cron: 0 4 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://domain.com/api/cron/enforce-publishing-quota
 */

import { NextRequest, NextResponse } from "next/server"

import { enforcePublishingQuota } from "@/lib/quota-enforcement"

export async function GET(req: NextRequest) {
  // Fail-closed: ha a titok nincs beállítva, a végpont nem hívható.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")

  if (!cronSecret) {
    console.error("[cron] enforce-publishing-quota: CRON_SECRET nincs beállítva, a hívás elutasítva")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const count = await enforcePublishingQuota()
    console.log(`[cron] enforce-publishing-quota: ${count} szalon publikálása letiltva`)
    return NextResponse.json({
      success: true,
      blocked: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[cron] enforce-publishing-quota hiba:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
