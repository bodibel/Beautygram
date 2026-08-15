import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

import { loadDotEnvIfNeeded } from "../utils/env"

const password = process.env.E2E_TEST_PASSWORD ?? "password123"
const users = {
  visitor: "e2e.visitor@glowyspot.test",
  provider: "e2e.provider@glowyspot.test",
  otherProvider: "e2e.other-provider@glowyspot.test",
  admin: "e2e.admin@glowyspot.test",
}

const salonSlug = "e2e-mvp-studio"
const otherSalonSlug = "e2e-other-studio"

loadDotEnvIfNeeded()

const connectionString = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("Missing E2E_DATABASE_URL or DATABASE_URL.")
}

assertSafeDatabaseUrl(connectionString)

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash(password, 10)

  await cleanupFixtureData()

  const visitor = await prisma.user.upsert({
    where: { email: users.visitor },
    update: { name: "E2E Visitor", password: passwordHash, role: "visitor", isActive: true },
    create: { email: users.visitor, name: "E2E Visitor", password: passwordHash, role: "visitor", isActive: true },
  })

  const provider = await prisma.user.upsert({
    where: { email: users.provider },
    update: { name: "E2E Provider", password: passwordHash, role: "provider", isActive: true },
    create: { email: users.provider, name: "E2E Provider", password: passwordHash, role: "provider", isActive: true },
  })

  const otherProvider = await prisma.user.upsert({
    where: { email: users.otherProvider },
    update: { name: "E2E Other Provider", password: passwordHash, role: "provider", isActive: true },
    create: { email: users.otherProvider, name: "E2E Other Provider", password: passwordHash, role: "provider", isActive: true },
  })

  await prisma.user.upsert({
    where: { email: users.admin },
    update: { name: "E2E Admin", password: passwordHash, role: "admin", isActive: true },
    create: { email: users.admin, name: "E2E Admin", password: passwordHash, role: "admin", isActive: true },
  })

  const salon = await prisma.salon.create({
    data: {
      name: "E2E MVP Studio",
      slug: salonSlug,
      country: "Magyarország",
      city: "Budapest",
      address: "E2E utca 1",
      categories: ["skin"],
      ownerId: provider.id,
      description: "E2E fixture szalon kritikus MVP flow tesztekhez.",
      images: ["/uploads/1768732066434-kozmetikastock01.webp"],
      profileImage: "/uploads/1768732066434-kozmetikastock01.webp",
      coverImage: "/uploads/1768732067322-pedicurestock04.webp",
      email: users.provider,
      phone: "+36123456789",
      languages: ["Hungarian"],
      allowBookings: true,
      allowMessages: true,
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      salonId: salon.id,
      plan: SubscriptionPlan.STANDARD,
      status: SubscriptionStatus.ACTIVE,
      billingCurrency: "HUF",
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
    },
  })

  const service = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: "E2E MVP Arckezelés",
      price: "12000",
      duration: "60 perc",
      description: "Stabil e2e foglalási szolgáltatás.",
    },
  })

  await prisma.message.create({
    data: {
      senderId: visitor.id,
      receiverId: provider.id,
      salonId: salon.id,
      subject: "E2E MVP szalon üzenet",
      content: "E2E seeded salon context message",
    },
  })

  const otherSalon = await prisma.salon.create({
    data: {
      name: "E2E Other Studio",
      slug: otherSalonSlug,
      country: "Magyarország",
      city: "Pécs",
      address: "E2E másik utca 2",
      categories: ["hair"],
      ownerId: otherProvider.id,
      description: "Másik provider tulajdonában lévő E2E fixture.",
      images: ["/uploads/1768732065537-pedicurestock10.webp"],
      profileImage: "/uploads/1768732065537-pedicurestock10.webp",
      coverImage: "/uploads/1768732065537-pedicurestock10.webp",
      allowBookings: true,
      allowMessages: true,
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      salonId: otherSalon.id,
      plan: SubscriptionPlan.STANDARD,
      status: SubscriptionStatus.ACTIVE,
      billingCurrency: "HUF",
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
    },
  })

  await prisma.service.create({
    data: {
      salonId: otherSalon.id,
      name: "E2E Other Service",
      price: "9000",
      duration: "45 perc",
    },
  })

  console.log(
    JSON.stringify({
      salonId: salon.id,
      salonSlug,
      serviceId: service.id,
      visitor: users.visitor,
      provider: users.provider,
    }),
  )
}

async function cleanupFixtureData() {
  const fixtureUsers = await prisma.user.findMany({
    where: { email: { in: Object.values(users) } },
    select: { id: true },
  })
  const userIds = fixtureUsers.map((user) => user.id)

  const fixtureSalons = await prisma.salon.findMany({
    where: { slug: { in: [salonSlug, otherSalonSlug] } },
    select: { id: true },
  })
  const salonIds = fixtureSalons.map((salon) => salon.id)

  await prisma.comment.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { post: { salonId: { in: salonIds } } },
      ],
    },
  })
  await prisma.like.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { post: { salonId: { in: salonIds } } },
      ],
    },
  })
  await prisma.review.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { salonId: { in: salonIds } },
      ],
    },
  })
  await prisma.favorite.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { salonId: { in: salonIds } },
      ],
    },
  })
  await prisma.booking.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { salonId: { in: salonIds } },
      ],
    },
  })
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: { in: userIds } },
        { receiverId: { in: userIds } },
        { salonId: { in: salonIds } },
      ],
    },
  })
  await prisma.post.deleteMany({ where: { salonId: { in: salonIds } } })
  await prisma.openingHour.deleteMany({ where: { salonId: { in: salonIds } } })
  await prisma.closedDate.deleteMany({ where: { salonId: { in: salonIds } } })
  await prisma.service.deleteMany({ where: { salonId: { in: salonIds } } })
  await prisma.teamMember.deleteMany({ where: { salonId: { in: salonIds } } })
  await prisma.subscription.deleteMany({ where: { salonId: { in: salonIds } } })
  await prisma.salon.deleteMany({ where: { id: { in: salonIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function assertSafeDatabaseUrl(value: string) {
  const url = new URL(value)
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  if (isLocal || process.env.E2E_ALLOW_NONLOCAL_DB === "true") return

  throw new Error(
    `Refusing to seed non-local database host "${url.hostname}". Set E2E_ALLOW_NONLOCAL_DB=true only for an approved disposable dev DB.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
