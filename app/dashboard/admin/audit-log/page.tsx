import { redirect } from "next/navigation"

import { MainLayout } from "@/components/layout/main-layout"
import { AUDIT_ACTIONS } from "@/lib/audit-log"
import { getActiveSessionUser } from "@/lib/auth-utils"
import prisma from "@/lib/db"

const PAGE_SIZE = 100

type AuditLogPageProps = {
    searchParams?: Promise<{
        action?: string
        userId?: string
        from?: string
    }>
}

/** Az esemény súlyossága szerinti színezés, hogy a gyanús sorok kiugorjanak. */
function actionTone(action: string) {
    if (action === AUDIT_ACTIONS.LOGIN_FAILED || action === AUDIT_ACTIONS.ACCESS_DENIED) {
        return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    }
    if (action.startsWith("ADMIN_")) {
        return "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
    }
    if (action === AUDIT_ACTIONS.LOGIN || action === AUDIT_ACTIONS.LOGOUT || action === AUDIT_ACTIONS.REGISTER) {
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    }
    return "bg-secondary text-muted-foreground"
}

function formatMetadata(metadata: unknown) {
    if (!metadata) return "-"

    const raw = JSON.stringify(metadata)
    if (!raw) return "-"
    return raw.length > 160 ? `${raw.slice(0, 157)}...` : raw
}

function formatTimestamp(value: Date) {
    return new Intl.DateTimeFormat("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(value)
}

export default async function AdminAuditLogPage({ searchParams }: AuditLogPageProps) {
    const params = searchParams ? await searchParams : {}
    const sessionUser = await getActiveSessionUser()

    if (!sessionUser) {
        redirect("/")
    }

    if (sessionUser.role !== "admin") {
        redirect("/dashboard?forbidden=true")
    }

    const action = params.action?.trim() || ""
    const userId = params.userId?.trim() || ""
    const from = params.from?.trim() || ""

    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null
    const hasValidFrom = fromDate !== null && !Number.isNaN(fromDate.getTime())

    const where = {
        ...(action ? { action } : {}),
        ...(userId ? { userId } : {}),
        ...(hasValidFrom ? { createdAt: { gte: fromDate } } : {}),
    }

    const [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: {
                user: { select: { name: true, email: true, role: true } },
            },
        }),
        prisma.auditLog.count({ where }),
    ])

    const knownActions = Object.values(AUDIT_ACTIONS).sort()

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Eseménynapló</h1>
                    <p className="text-sm text-muted-foreground">
                        Rendszerszintű események admin olvasásra. {totalCount} találat, ebből a legfrissebb {Math.min(PAGE_SIZE, logs.length)} látszik.
                    </p>
                </div>

                <form className="grid gap-4 rounded-2xl border border-border bg-surface p-4 md:grid-cols-4">
                    <div className="space-y-2">
                        <label htmlFor="action" className="text-sm font-medium">Esemény</label>
                        <input
                            id="action"
                            name="action"
                            list="audit-actions"
                            defaultValue={action}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            placeholder="pl. LOGIN_FAILED"
                        />
                        <datalist id="audit-actions">
                            {knownActions.map((item) => (
                                <option key={item} value={item} />
                            ))}
                        </datalist>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="userId" className="text-sm font-medium">Felhasználó ID</label>
                        <input
                            id="userId"
                            name="userId"
                            defaultValue={userId}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            placeholder="cuid..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="from" className="text-sm font-medium">Ettől a naptól</label>
                        <input
                            id="from"
                            name="from"
                            type="date"
                            defaultValue={from}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                        >
                            Szűrés
                        </button>
                        <a
                            href="/dashboard/admin/audit-log"
                            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
                        >
                            Törlés
                        </a>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-secondary/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Időpont</th>
                                <th className="px-4 py-3 text-left font-semibold">Esemény</th>
                                <th className="px-4 py-3 text-left font-semibold">Felhasználó</th>
                                <th className="px-4 py-3 text-left font-semibold">Entitás</th>
                                <th className="px-4 py-3 text-left font-semibold">IP</th>
                                <th className="px-4 py-3 text-left font-semibold">Részletek</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                        Nincs találat a megadott szűrőkre.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="align-top">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatTimestamp(log.createdAt)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${actionTone(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.user ? (
                                                <div className="min-w-[160px]">
                                                    <div className="font-medium">{log.user.name || "-"}</div>
                                                    <div className="text-xs text-muted-foreground">{log.user.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">{log.userId || "-"}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                            {log.entity ? `${log.entity}${log.entityId ? ` · ${log.entityId}` : ""}` : "-"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                            {log.ipAddress || "-"}
                                        </td>
                                        <td className="max-w-[420px] break-words px-4 py-3 text-muted-foreground">
                                            {formatMetadata(log.metadata)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    )
}
