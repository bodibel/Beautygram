import { redirect } from "next/navigation"

import { getActiveSessionUser } from "@/lib/auth-utils"
import prisma from "@/lib/db"

export async function requireSalonConsoleOwner(salonId: string) {
  const user = await getActiveSessionUser()

  if (!user) {
    redirect("/")
  }

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      ownerId: true,
      name: true,
      city: true,
      isActive: true,
      profileImage: true,
    },
  })

  if (!salon || salon.ownerId !== user.id) {
    redirect("/dashboard/salons")
  }

  return { user, salon }
}
