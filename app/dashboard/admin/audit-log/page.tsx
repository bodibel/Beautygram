import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { MainLayout } from "@/components/layout/main-layout"
import { authOptions } from "@/lib/auth-options"
import prisma from "@/lib/db"

type AuditLogPageProps = {
    searchParams?: Promise<{
        action?: string
        userId?: string
        from?: string
    }>
}

function formatMetadata(metadata: unknown) {
    if (!metadata) return "-"

    const raw = JSON.stringify(metadata)
    if (!raw) return "-"
    return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw
}

export default async function AdminAuditLogPage({ searchParams }: AuditLogPageProps) {
    const params = searchParams ? await searchParams : {}
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect("/")
    }

    const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    })

    if (adminUser?.role !== "admin") {
        redirect("/dashboard?forbidden=true")
    }

    const action = params.action?.trim() || ""
    const userId = params.userId?.trim() || ""
    const from = params.from?.trim() || ""

    const logs = await prisma.auditLog.findMany({
        where: {
            ...(action ? { action } : {}),
            ...(userId ? { userId } : {}),
            ...(from
                ? {
                    createdAt: {
                        gte: new Date(`${from}T00:00:00.000Z`)
                    }
                }
                : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    })

    return (
        <MainLayout>
            <div className="container mx-auto p-6 space-y-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Audit Log</h1>
                    <p className="text-sm text-muted-foreground">
                        Rendszerszintű események admin olvasásra. Legfeljebb 100 legfrissebb találat jelenik meg.
                    </p>
                </div>

                <form className="grid gap-4 rounded-2xl border border-border bg-surface p-4 md:grid-cols-4">
                    <div className="space-y-2">
                        <label htmlFor="action" className="text-sm font-medium">Action</label>
                        <input
                            id="action"
                            name="action"
                            defaultValue={action}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            placeholder="pl. LOGIN"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="userId" className="text-sm font-medium">User ID</label>
                        <input
                            id="userId"
                            name="userId"
                            defaultValue={userId}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            placeholder="cuid..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="from" className="text-sm font-medium">From Date</label>
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
                            Reset
                        </a>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-2xl border border-border bg-white">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-secondary/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">createdAt</th>
                                <th className="px-4 py-3 text-left font-semibold">userId</th>
                                <th className="px-4 py-3 text-left font-semibold">action</th>
                                <th className="px-4 py-3 text-left font-semibold">entity</th>
                                <th className="px-4 py-3 text-left font-semibold">entityId</th>
                                <th className="px-4 py-3 text-left font-semibold">metadata</th>
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
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {log.createdAt.toISOString()}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {log.userId || "-"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium">
                                            {log.action}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {log.entity || "-"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {log.entityId || "-"}
                                        </td>
                                        <td className="px-4 py-3 max-w-[420px] break-words text-muted-foreground">
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
