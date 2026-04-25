"use client"

import { createContext, useContext } from "react"
import { useSession, SessionProvider } from "next-auth/react"

type UserRole = "visitor" | "provider" | "admin"

interface UserData {
    id: string
    email: string
    role: UserRole
    name?: string
    image?: string
}

interface AuthContextType {
    user: any | null
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
    const userData = session?.user
        ? {
            id: (session.user as any).id,
            email: session.user.email || "",
            role: ((session.user as any).role || "visitor") as UserRole,
            name: session.user.name || undefined,
            image: session.user.image || undefined
        }
        : null

    return (
        <AuthContext.Provider value={{ user: session?.user ?? null, userData, loading }}>
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

