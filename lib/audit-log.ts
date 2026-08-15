import { Prisma } from "@prisma/client"
import { headers } from "next/headers"
import type { NextRequest } from "next/server"

import prisma from "@/lib/db"

/**
 * Az alkalmazásban naplózott események azonosítói.
 *
 * Új esemény felvételekor ide is fel kell venni, hogy az admin audit nézet
 * szűrője és a riportok konzisztensek maradjanak.
 */
export const AUDIT_ACTIONS = {
    // Hitelesítés
    LOGIN: "LOGIN",
    LOGIN_FAILED: "LOGIN_FAILED",
    LOGOUT: "LOGOUT",
    REGISTER: "REGISTER",
    PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
    PASSWORD_RESET_COMPLETE: "PASSWORD_RESET_COMPLETE",

    // Fiókkezelés
    ACCOUNT_SELF_DEACTIVATE: "ACCOUNT_SELF_DEACTIVATE",
    ACCOUNT_SELF_RESTORE: "ACCOUNT_SELF_RESTORE",
    ACCOUNT_AUTO_RESTORE: "ACCOUNT_AUTO_RESTORE",
    PROFILE_UPDATE: "PROFILE_UPDATE",

    // Admin műveletek
    ADMIN_USER_UPDATE: "ADMIN_USER_UPDATE",
    ADMIN_USER_DELETE: "ADMIN_USER_DELETE",
    ADMIN_USER_ROLE_CHANGE: "ADMIN_USER_ROLE_CHANGE",
    ADMIN_USER_DEACTIVATE: "ADMIN_USER_DEACTIVATE",
    ADMIN_USER_ACTIVATE: "ADMIN_USER_ACTIVATE",
    ADMIN_CATEGORY_CREATE: "ADMIN_CATEGORY_CREATE",
    ADMIN_CATEGORY_UPDATE: "ADMIN_CATEGORY_UPDATE",
    ADMIN_CATEGORY_DELETE: "ADMIN_CATEGORY_DELETE",

    // Szalon
    CREATE_SALON: "CREATE_SALON",
    UPDATE_SALON: "UPDATE_SALON",
    DELETE_SALON: "DELETE_SALON",
    SALON_PROFILE_VIEW: "SALON_PROFILE_VIEW",

    // Tartalom és kommunikáció
    SEND_MESSAGE: "SEND_MESSAGE",
    UPLOAD_FILE: "UPLOAD_FILE",

    // Jogosultság
    ACCESS_DENIED: "ACCESS_DENIED",
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

type AuditLogInput = {
    action: AuditAction | string
    userId?: string | null
    entity?: string | null
    entityId?: string | null
    metadata?: Prisma.InputJsonValue | null
    ipAddress?: string | null
    userAgent?: string | null
}

/**
 * Naplóbejegyzést ír az AuditLog táblába.
 *
 * Szándékosan soha nem dob hibát: a naplózás meghibásodása nem akaszthatja meg
 * az üzleti műveletet. Sikertelenség esetén `null`-t ad vissza és `console.error`-ral jelez.
 */
export async function writeAuditLog(entry: AuditLogInput) {
    try {
        const metadata =
            entry.metadata === undefined
                ? undefined
                : entry.metadata === null
                    ? Prisma.JsonNull
                    : entry.metadata

        return await prisma.auditLog.create({
            data: {
                action: entry.action,
                userId: entry.userId ?? null,
                entity: entry.entity ?? null,
                entityId: entry.entityId ?? null,
                metadata,
                ipAddress: entry.ipAddress ?? null,
                userAgent: entry.userAgent ?? null,
            }
        })
    } catch (error) {
        console.error("Audit log write failed:", error)
        return null
    }
}

function pickRequestContext(getHeader: (name: string) => string | null) {
    const forwardedFor = getHeader("x-forwarded-for")
    const realIp = getHeader("x-real-ip")
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null
    const userAgent = getHeader("user-agent")

    return { ipAddress, userAgent }
}

/** Route handlerekhez (NextRequest elérhető). */
export function getAuditRequestContext(request: NextRequest) {
    return pickRequestContext((name) => request.headers.get(name))
}

/**
 * Szerver action-ökhöz, ahol nincs NextRequest.
 * Ha a header-kontextus nem elérhető, üres kontextussal tér vissza.
 */
export async function getAuditActionContext() {
    try {
        const headerList = await headers()
        return pickRequestContext((name) => headerList.get(name))
    } catch {
        return { ipAddress: null, userAgent: null }
    }
}
