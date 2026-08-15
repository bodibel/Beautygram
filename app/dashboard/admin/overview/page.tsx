import { FileText, ShieldAlert, Store, Users } from "lucide-react"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AUDIT_ACTIONS } from "@/lib/audit-log"
import prisma from "@/lib/db"

/** Az adatok mindig frissen olvasódnak, a KPI-k nem cache-elődnek. */
export const dynamic = "force-dynamic"

function formatDelta(current: number, previous: number) {
    if (previous === 0) {
        return current === 0 ? "Nincs változás az elmúlt hónapban" : `+${current} az elmúlt hónapban`
    }
    const percent = Math.round(((current - previous) / previous) * 100)
    const sign = percent > 0 ? "+" : ""
    return `${sign}${percent}% az elmúlt hónapban`
}

export default async function AdminOverviewPage() {
    const now = new Date()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const [
        totalUsers,
        usersThisMonth,
        usersPrevMonth,
        totalProviders,
        providersThisMonth,
        providersPrevMonth,
        totalSalons,
        salonsThisMonth,
        salonsPrevMonth,
        totalPosts,
        postsThisMonth,
        postsPrevMonth,
        failedLogins24h,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }),

        prisma.user.count({ where: { role: "provider" } }),
        prisma.user.count({ where: { role: "provider", createdAt: { gte: monthAgo } } }),
        prisma.user.count({ where: { role: "provider", createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }),

        prisma.salon.count(),
        prisma.salon.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.salon.count({ where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }),

        prisma.post.count(),
        prisma.post.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.post.count({ where: { createdAt: { gte: twoMonthsAgo, lt: monthAgo } } }),

        prisma.auditLog.count({
            where: {
                action: AUDIT_ACTIONS.LOGIN_FAILED,
                createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            },
        }),
    ])

    const cards = [
        {
            title: "Összes felhasználó",
            icon: Users,
            value: totalUsers,
            hint: formatDelta(usersThisMonth, usersPrevMonth),
        },
        {
            title: "Szolgáltatók",
            icon: Users,
            value: totalProviders,
            hint: formatDelta(providersThisMonth, providersPrevMonth),
        },
        {
            title: "Szalonok",
            icon: Store,
            value: totalSalons,
            hint: formatDelta(salonsThisMonth, salonsPrevMonth),
        },
        {
            title: "Bejegyzések",
            icon: FileText,
            value: totalPosts,
            hint: formatDelta(postsThisMonth, postsPrevMonth),
        },
    ]

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full p-6">
                <h1 className="mb-6 text-3xl font-bold">Áttekintés</h1>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => (
                        <Card key={card.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                                <card.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                                <p className="text-xs text-muted-foreground">{card.hint}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Sikertelen bejelentkezések (24 óra)</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{failedLogins24h}</div>
                            <p className="text-xs text-muted-foreground">
                                <a href="/dashboard/admin/audit-log?action=LOGIN_FAILED" className="underline">
                                    Megtekintés az eseménynaplóban
                                </a>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    )
}
