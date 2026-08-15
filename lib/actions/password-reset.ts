"use server"

import prisma from "@/lib/db"
import bcrypt from "bcryptjs"
import { AUDIT_ACTIONS, getAuditActionContext, writeAuditLog } from "@/lib/audit-log"
import { validatePassword } from "@/lib/auth/password-policy"
import { sendPasswordResetEmail } from "@/lib/mail"
import { generatePasswordResetToken } from "@/lib/tokens"

export async function resetPasswordRequest(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
             // To prevent email enumeration, we return success even if the email doesn't exist
            return { success: "Ha az email cím szerepel a rendszerben, elküldtük a visszaállító linket." }
        }

        const passwordResetToken = await generatePasswordResetToken(email)
        await sendPasswordResetEmail(
            passwordResetToken.email,
            passwordResetToken.token
        )

        await writeAuditLog({
            action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
            userId: user.id,
            entity: "User",
            entityId: user.id,
            metadata: { email },
            ...(await getAuditActionContext()),
        })

        return { success: "A jelszóvisszaállító email elküldve!" }
    } catch (error) {
        console.error("Password reset request error:", error)
        return { error: "Hiba történt. Kérjük próbálja újra később." }
    }
}

export async function resetPassword(password: string, token: string) {
    try {
        const existingToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        })

        if (!existingToken) {
            return { error: "Érvénytelen jelszóvisszaállító token!" }
        }

        const hasExpired = new Date(existingToken.expires) < new Date()

        if (hasExpired) {
            return { error: "A jelszóvisszaállító token lejárt!" }
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: existingToken.email }
        })

        if (!existingUser) {
            return { error: "A felhasználó nem található!" }
        }

        const passwordError = validatePassword(password)
        if (passwordError) {
            return { error: passwordError }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.update({
            where: { id: existingUser.id },
            data: { password: hashedPassword }
        })

        await prisma.passwordResetToken.delete({
            where: { id: existingToken.id }
        })

        await writeAuditLog({
            action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE,
            userId: existingUser.id,
            entity: "User",
            entityId: existingUser.id,
            ...(await getAuditActionContext()),
        })

        return { success: "A jelszó sikeresen megváltoztatva!" }

    } catch (error) {
        console.error("Password reset action error:", error)
        return { error: "Hiba történt a jelszó visszaállítása során." }
    }
}
