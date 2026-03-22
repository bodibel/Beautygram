// lib/slug.ts

/**
 * Transliterate Hungarian characters and generate a URL-safe slug.
 * Pure function — safe to call on the client.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ö/g, "o")
    .replace(/ő/g, "o")
    .replace(/ú/g, "u")
    .replace(/ü/g, "u")
    .replace(/ű/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Generate a slug that is guaranteed unique in the DB.
 * Appends -2, -3, ... if the base slug is already taken.
 * Pass excludeId to skip checking the salon's own current record (for future slug updates).
 */
export async function generateUniqueSlug(
  name: string,
  prisma: import("@prisma/client").PrismaClient,
  excludeId?: string
): Promise<string> {
  const base = generateSlug(name)
  let slug = base
  let counter = 2

  while (true) {
    const existing = await prisma.salon.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return slug
    slug = `${base}-${counter++}`
  }
}
