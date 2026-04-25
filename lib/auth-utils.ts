import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

/**
 * Returns the session user id, or throws an error if not authenticated.
 * Use this at the start of every server action that requires login.
 */
export async function requireSession(): Promise<string> {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        throw new Error("Hitelesítés szükséges.")
    }
    return session.user.id
}
