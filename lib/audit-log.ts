import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import type { NextRequest } from "next/server"

type AuditLogInput = {
    action: string
    userId?: string | null
    entity?: string | null
    entityId?: string | null
    metadata?: Prisma.InputJsonValue | null
    ipAddress?: string | null
    userAgent?: string | null
}

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

export function getAuditRequestContext(request: NextRequest) {
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null
    const userAgent = request.headers.get("user-agent")

    return {
        ipAddress,
        userAgent,
    }
}
