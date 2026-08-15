import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import type { NextAuthOptions, Session, User } from "next-auth"
import type { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import prisma from "@/lib/db"

type AppUser = User & { role?: string }
type AppSessionUser = NonNullable<Session["user"]> & { id?: string; role?: string }
type AppToken = JWT & { role?: string; name?: string | null }

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Hiányzó adatok!")
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                })

                if (!user || !user.password) {
                    await writeAuditLog({
                        action: AUDIT_ACTIONS.LOGIN_FAILED,
                        entity: "User",
                        metadata: { email: credentials.email, reason: "unknown_user" },
                        ...(await getAuditActionContext()),
                    })
                    throw new Error("Hibás email cím vagy jelszó.")
                }

                const isValid = await bcrypt.compare(credentials.password, user.password)

                if (!isValid) {
                    await writeAuditLog({
                        action: AUDIT_ACTIONS.LOGIN_FAILED,
                        userId: user.id,
                        entity: "User",
                        entityId: user.id,
                        metadata: { email: credentials.email, reason: "bad_password" },
                        ...(await getAuditActionContext()),
                    })
                    throw new Error("Hibás email cím vagy jelszó.")
                }

                // Adminisztrátor által letiltott fiók nem jelentkezhet be.
                if (!user.isActive && user.deactivatedBy === "admin") {
                    await writeAuditLog({
                        action: AUDIT_ACTIONS.LOGIN_FAILED,
                        userId: user.id,
                        entity: "User",
                        entityId: user.id,
                        metadata: { email: credentials.email, reason: "admin_disabled" },
                        ...(await getAuditActionContext()),
                    })
                    throw new Error("Ez a fiók le van tiltva. Vedd fel a kapcsolatot az ügyfélszolgálattal.")
                }

                return user
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false

            const dbUser = await prisma.user.findUnique({
                where: { email: user.email }
            })

            // Adminisztrátori tiltás soha nem oldható fel bejelentkezéssel.
            if (dbUser && !dbUser.isActive && dbUser.deactivatedBy === "admin") {
                await writeAuditLog({
                    action: AUDIT_ACTIONS.LOGIN_FAILED,
                    userId: dbUser.id,
                    entity: "User",
                    entityId: dbUser.id,
                    metadata: { email: dbUser.email, reason: "admin_disabled" },
                    ...(await getAuditActionContext()),
                })
                return false
            }

            // Csak a felhasználó saját maga által inaktivált fiók éled újra automatikusan,
            // a 30 napos türelmi időn belül.
            if (dbUser && !dbUser.isActive && dbUser.inactivatedAt && dbUser.deactivatedBy !== "admin") {
                const now = new Date()
                const daysDiff = (now.getTime() - dbUser.inactivatedAt.getTime()) / (1000 * 3600 * 24)

                if (daysDiff > 30) {
                    return false
                }

                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { isActive: true, inactivatedAt: null, deactivatedBy: null }
                })
                await writeAuditLog({
                    action: AUDIT_ACTIONS.ACCOUNT_AUTO_RESTORE,
                    userId: dbUser.id,
                    entity: "User",
                    entityId: dbUser.id,
                    metadata: { daysSinceDeactivation: Math.round(daysDiff) },
                    ...(await getAuditActionContext()),
                })
                await prisma.salon.updateMany({
                    where: { ownerId: dbUser.id, inactivatedAt: { not: null } },
                    data: { isActive: true, inactivatedAt: null }
                })
                const salons = await prisma.salon.findMany({
                    where: { ownerId: dbUser.id },
                    select: { id: true }
                })
                const salonIds = salons.map((salon) => salon.id)
                await prisma.post.updateMany({
                    where: { salonId: { in: salonIds }, inactivatedAt: { not: null } },
                    data: { isActive: true, inactivatedAt: null }
                })
            }
            return true
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                const sessionUser = session.user as AppSessionUser
                const appToken = token as AppToken
                sessionUser.id = token.sub
                sessionUser.role = appToken.role
                sessionUser.name = appToken.name ?? session.user.name
            }
            return session
        },
        async jwt({ token, user, trigger }) {
            const appToken = token as AppToken

            if (user) {
                const appUser = user as AppUser
                appToken.sub = appUser.id
                appToken.role = appUser.role
                appToken.name = appUser.name
            } else if (appToken.sub && !appToken.role) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: appToken.sub },
                    select: { role: true, name: true }
                })
                if (dbUser) {
                    appToken.role = dbUser.role
                    appToken.name = dbUser.name
                }
            }

            if (trigger === "update" && appToken.sub) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: appToken.sub },
                    select: { role: true, name: true }
                })
                if (dbUser) {
                    appToken.role = dbUser.role
                    appToken.name = dbUser.name
                }
            }
            return appToken
        }
    },
    events: {
        async signIn({ user, account, isNewUser }) {
            await writeAuditLog({
                action: AUDIT_ACTIONS.LOGIN,
                userId: user.id,
                entity: "User",
                entityId: user.id,
                metadata: {
                    email: user.email,
                    provider: account?.provider ?? "credentials",
                    isNewUser: Boolean(isNewUser),
                },
                ...(await getAuditActionContext()),
            })
        },
        async signOut({ token }) {
            await writeAuditLog({
                action: AUDIT_ACTIONS.LOGOUT,
                userId: token?.sub ?? null,
                entity: "User",
                entityId: token?.sub ?? null,
                ...(await getAuditActionContext()),
            })
        },
    },
    pages: {
        signIn: "/",
        error: "/auth/error",
    }
}
