import { PrismaClient } from "@prisma/client"
import { generateUniqueSlug } from "../lib/slug"

const prisma = new PrismaClient()

async function main() {
  const salons = await prisma.salon.findMany({
    where: { slug: null },
    select: { id: true, name: true },
  })

  console.log(`Backfilling slugs for ${salons.length} salons...`)

  for (const salon of salons) {
    const slug = await generateUniqueSlug(salon.name, prisma, salon.id)
    await prisma.salon.update({
      where: { id: salon.id },
      data: { slug },
    })
    console.log(`  ${salon.name} → ${slug}`)
  }

  console.log("Done!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
