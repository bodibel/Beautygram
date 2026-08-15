import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth-options"
import prisma from "@/lib/db"

export interface ActiveSessionUser {
    id: string
    role: string
    name: string | null
    email: string | null
    image: string | null
}

export async function getActiveSessionUser(): Promise<ActiveSessionUser | null> {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return null

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            image: true,
            isActive: true,
        },
    })

    if (!user?.isActive) return null

    return {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        image: user.image,
    }
}

export async function requireActiveSessionUser(): Promise<ActiveSessionUser> {
    const user = await getActiveSessionUser()
    if (!user) {
        throw new Error("Hitelesítés szükséges.")
    }
    return user
}

/**
 * Returns the active session user id, or throws an error if not authenticated
 * or the account has been disabled.
 */
export async function requireSession(): Promise<string> {
    const user = await requireActiveSessionUser()
    return user.id
}

export async function requireAdminSession(): Promise<ActiveSessionUser> {
    const user = await requireActiveSessionUser()
    if (user.role !== "admin") {
        throw new Error("Unauthorized")
    }
    return user
}
