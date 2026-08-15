"use client"

import { createContext, useContext } from "react"
import { useSession, SessionProvider } from "next-auth/react"
import type { DefaultSession } from "next-auth"

type UserRole = "visitor" | "provider" | "admin"
type SessionUser = NonNullable<DefaultSession["user"]>

interface AuthUser extends SessionUser {
    id: string
    role?: UserRole
}

interface UserData {
    id: string
    email: string
    role: UserRole
    name?: string
    image?: string
}

interface AuthContextType {
    user: AuthUser | null
    userData: UserData | null
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
})

function AuthInternalProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const loading = status === "loading"
    const user = (session?.user as AuthUser | undefined) ?? null

    const userData: UserData | null = user
        ? {
            id: user.id,
            email: user.email || "",
            role: user.role || "visitor",
            name: user.name || undefined,
            image: user.image || undefined,
        }
        : null

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthInternalProvider>
                {children}
            </AuthInternalProvider>
        </SessionProvider>
    )
}

export const useAuth = () => useContext(AuthContext)
