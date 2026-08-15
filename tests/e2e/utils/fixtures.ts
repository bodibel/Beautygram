import { Pool } from "pg"

import { loadDotEnvIfNeeded } from "./env"
import { testUsers } from "./auth"

export interface SmokeFixtures {
  providerSalonId: string
  otherProviderSalonId: string
  serviceCount: number
  pendingBookingCount: number
  salonMessageCount: number
}

export async function readSmokeFixtures(): Promise<SmokeFixtures> {
  loadDotEnvIfNeeded()

  const connectionString = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or E2E_DATABASE_URL for Playwright smoke fixture lookup.")
  }

  const pool = new Pool({ connectionString })

  try {
    const providerSalon = await pool.query<{ id: string }>(
      `
        SELECT s.id
        FROM "Salon" s
        JOIN "User" u ON u.id = s."ownerId"
        WHERE u.email = $1 AND s."isActive" = true
        ORDER BY s.name ASC
        LIMIT 1
      `,
      [testUsers.provider]
    )

    const otherProviderSalon = await pool.query<{ id: string }>(
      `
        SELECT s.id
        FROM "Salon" s
        JOIN "User" u ON u.id = s."ownerId"
        WHERE u.email = $1 AND s."isActive" = true
        ORDER BY s.name ASC
        LIMIT 1
      `,
      [testUsers.otherProvider]
    )

    const providerSalonId = providerSalon.rows[0]?.id
    const otherProviderSalonId = otherProviderSalon.rows[0]?.id

    if (!providerSalonId) {
      throw new Error(`Missing active salon fixture for ${testUsers.provider}. Run the local/dev seed first.`)
    }

    if (!otherProviderSalonId) {
      throw new Error(`Missing active salon fixture for ${testUsers.otherProvider}. Run the local/dev seed first.`)
    }

    const serviceCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "Service" WHERE "salonId" = $1`,
      [providerSalonId]
    )

    const pendingBookingCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "Booking" WHERE "salonId" = $1 AND status = 'pending'`,
      [providerSalonId]
    )

    const salonMessageCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "Message" WHERE "salonId" = $1`,
      [providerSalonId]
    )

    return {
      providerSalonId,
      otherProviderSalonId,
      serviceCount: Number(serviceCount.rows[0]?.count ?? 0),
      pendingBookingCount: Number(pendingBookingCount.rows[0]?.count ?? 0),
      salonMessageCount: Number(salonMessageCount.rows[0]?.count ?? 0),
    }
  } finally {
    await pool.end()
  }
}
