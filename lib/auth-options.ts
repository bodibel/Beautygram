import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"
import { writeAuditLog } from "@/lib/audit-log"

const googleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
)
const isSecureAuth = (process.env.NEXTAUTH_URL || "").startsWith("https://")

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Hiányzó adatok!")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error("Hibás email cím vagy jelszó.")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Hibás email cím vagy jelszó.")
        }

        return user
      },
    }),
    ...(googleAuthEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt" as const,
  },
  cookies: {
    state: {
      name: `${isSecureAuth ? "__Secure-" : ""}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isSecureAuth,
      },
    },
    pkceCodeVerifier: {
      name: `${isSecureAuth ? "__Secure-" : ""}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isSecureAuth,
      },
    },
    callbackUrl: {
      name: `${isSecureAuth ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        sameSite: "lax" as const,
        path: "/",
        secure: isSecureAuth,
      },
    },
    csrfToken: {
      name: `${isSecureAuth ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isSecureAuth,
      },
    },
  },
  callbacks: {
    async signIn({ user, account }: any) {
      const dbUser = user?.email
        ? await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true },
          })
        : null

      if (
        account?.provider === "google" &&
        dbUser &&
        !dbUser.accounts.some(
          (existingAccount) =>
            existingAccount.provider === "google" &&
            existingAccount.providerAccountId === account.providerAccountId
        )
      ) {
        await prisma.account.create({
          data: {
            userId: dbUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token ?? null,
            expires_at: account.expires_at ?? null,
            id_token: account.id_token ?? null,
            refresh_token: account.refresh_token ?? null,
            scope: account.scope ?? null,
            session_state:
              typeof account.session_state === "string" ? account.session_state : null,
            token_type: account.token_type ?? null,
          },
        })

        user.id = dbUser.id
        user.role = dbUser.role
        user.name = dbUser.name ?? user.name
      }

      if (dbUser && !dbUser.isActive && dbUser.inactivatedAt) {
        const now = new Date()
        const daysDiff = (now.getTime() - dbUser.inactivatedAt.getTime()) / (1000 * 3600 * 24)

        if (daysDiff <= 30) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { isActive: true, inactivatedAt: null },
          })
          await prisma.salon.updateMany({
            where: { ownerId: dbUser.id, inactivatedAt: { not: null } },
            data: { isActive: true, inactivatedAt: null },
          })
          const salons = await prisma.salon.findMany({
            where: { ownerId: dbUser.id },
            select: { id: true },
          })
          const salonIds = salons.map((salon) => salon.id)
          await prisma.post.updateMany({
            where: { salonId: { in: salonIds }, inactivatedAt: { not: null } },
            data: { isActive: true, inactivatedAt: null },
          })
        } else {
          return false
        }
      }
      return true
    },
    async session({ session, token }: any) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        ;(session.user as any).role = token.role
        session.user.name = token.name
      }
      return session
    },
    async jwt({ token, user, trigger }: any) {
      if (user) {
        token.sub = user.id
        token.role = user.role
        token.name = user.name
      } else if (token.sub && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, name: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.name = dbUser.name
        }
      }
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, name: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.name = dbUser.name
        }
      }
      return token
    },
  },
  events: {
    async signIn(message: any) {
      await writeAuditLog({
        action: "LOGIN",
        userId: message.user?.id ?? null,
        entity: "USER",
        entityId: message.user?.id ?? null,
        metadata: {
          provider: message.account?.provider ?? "unknown",
        },
      })
    },
    async signOut(message: any) {
      const userId =
        message.token?.sub ??
        message.session?.user?.id ??
        message.user?.id ??
        null

      await writeAuditLog({
        action: "LOGOUT",
        userId,
        entity: "USER",
        entityId: userId,
      })
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
}
