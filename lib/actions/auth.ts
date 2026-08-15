"use server"

import { sendWelcomeEmail } from "@/lib/mail"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import { isValidEmail, validatePassword } from "@/lib/auth/password-policy"
import { isPublicRegistrationRole } from "@/lib/auth/role-policy"

export async function registerUser(data: { email: string; name: string; role: string; password?: string }) {
    try {
        if (!isPublicRegistrationRole(data.role)) {
            return { error: "Érvénytelen regisztrációs szerepkör." }
        }

        const email = data.email?.trim().toLowerCase()
        if (!email || !isValidEmail(email)) {
            return { error: "Érvénytelen email cím." }
        }

        const name = data.name?.trim()
        if (!name) {
            return { error: "A név megadása kötelező." }
        }

        if (data.password) {
            const passwordError = validatePassword(data.password)
            if (passwordError) {
                return { error: passwordError }
            }
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { error: "A felhasználó már létezik ezzel az email címmel." }
        }

        let hashedPassword = undefined
        if (data.password) {
            hashedPassword = await bcrypt.hash(data.password, 10)
        }

        const user = await prisma.user.create({
            data: {
                email,
                name,
                role: data.role,
                password: hashedPassword
            }
        })

        await writeAuditLog({
            action: AUDIT_ACTIONS.REGISTER,
            userId: user.id,
            entity: "User",
            entityId: user.id,
            metadata: { email, role: data.role },
            ...(await getAuditActionContext()),
        })

        try {
            await sendWelcomeEmail(email, user.name || "Felhasználó")
        } catch(emailError) {
             console.error("Failed to send welcome email:", emailError)
        }

        return { success: true, user }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Hiba történt a regisztráció során. Kérjük, próbáld újra!" }
    }
}
