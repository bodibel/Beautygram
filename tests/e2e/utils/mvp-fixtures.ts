import { Pool } from "pg"

import { loadDotEnvIfNeeded } from "./env"

export const mvpTestUsers = {
  visitor: "e2e.visitor@glowyspot.test",
  provider: "e2e.provider@glowyspot.test",
  otherProvider: "e2e.other-provider@glowyspot.test",
  admin: "e2e.admin@glowyspot.test",
} as const

export interface MvpFixtures {
  visitorId: string
  providerId: string
  salonId: string
  salonSlug: string
  serviceId: string
  otherProviderSalonId: string
}

export async function readMvpFixtures(): Promise<MvpFixtures> {
  loadDotEnvIfNeeded()

  const connectionString = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or E2E_DATABASE_URL for MVP e2e fixture lookup.")
  }

  const pool = new Pool({ connectionString })

  try {
    const fixture = await pool.query<{
      visitor_id: string
      provider_id: string
      salon_id: string
      salon_slug: string
      service_id: string
    }>(
      `
        SELECT
          visitor.id AS visitor_id,
          provider.id AS provider_id,
          salon.id AS salon_id,
          salon.slug AS salon_slug,
          service.id AS service_id
        FROM "User" visitor
        CROSS JOIN "User" provider
        JOIN "Salon" salon ON salon."ownerId" = provider.id
        JOIN "Service" service ON service."salonId" = salon.id
        WHERE visitor.email = $1
          AND provider.email = $2
          AND salon.slug = 'e2e-mvp-studio'
        ORDER BY service.name ASC
        LIMIT 1
      `,
      [mvpTestUsers.visitor, mvpTestUsers.provider],
    )

    const otherSalon = await pool.query<{ id: string }>(
      `SELECT id FROM "Salon" WHERE slug = 'e2e-other-studio' LIMIT 1`,
    )

    const row = fixture.rows[0]
    if (!row) {
      throw new Error("Missing MVP e2e fixtures. Run npm run e2e:seed first.")
    }

    const otherProviderSalonId = otherSalon.rows[0]?.id
    if (!otherProviderSalonId) {
      throw new Error("Missing MVP other-provider salon fixture. Run npm run e2e:seed first.")
    }

    return {
      visitorId: row.visitor_id,
      providerId: row.provider_id,
      salonId: row.salon_id,
      salonSlug: row.salon_slug,
      serviceId: row.service_id,
      otherProviderSalonId,
    }
  } finally {
    await pool.end()
  }
}

export async function cleanupMvpRuntimeData() {
  loadDotEnvIfNeeded()

  const connectionString = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) return

  const pool = new Pool({ connectionString })

  try {
    const users = await pool.query<{ id: string }>(
      `SELECT id FROM "User" WHERE email = ANY($1::text[])`,
      [Object.values(mvpTestUsers)],
    )
    const userIds = users.rows.map((row) => row.id)

    const salons = await pool.query<{ id: string }>(
      `SELECT id FROM "Salon" WHERE slug IN ('e2e-mvp-studio', 'e2e-other-studio')`,
    )
    const salonIds = salons.rows.map((row) => row.id)

    if (userIds.length === 0 && salonIds.length === 0) return

    await pool.query(
      `DELETE FROM "Booking" WHERE "userId" = ANY($1::text[]) OR "salonId" = ANY($2::text[])`,
      [userIds, salonIds],
    )
    await pool.query(
      `DELETE FROM "Message" WHERE "senderId" = ANY($1::text[]) OR "receiverId" = ANY($1::text[]) OR "salonId" = ANY($2::text[])`,
      [userIds, salonIds],
    )
    await pool.query(
      `DELETE FROM "Post" WHERE "salonId" = ANY($1::text[]) AND content LIKE 'E2E:%'`,
      [salonIds],
    )
  } finally {
    await pool.end()
  }
}
