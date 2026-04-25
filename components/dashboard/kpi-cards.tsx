"use client"

import { Briefcase, Calendar, Eye } from "lucide-react"

type KpiCardsProps = {
    bookingsToday: number
    pendingRequests: number
    servicesCount: number
    postsCount: number
    totalViews: number
    todayViews: number
}

function MiniMeter({ value, max }: { value: number; max: number }) {
    const safeMax = Math.max(max, 1)
    const percent = Math.min(100, Math.round((value / safeMax) * 100))

    return (
        <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <span>Arány</span>
                <span>{percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}

export function KpiCards({
    bookingsToday,
    pendingRequests,
    servicesCount,
    postsCount,
    totalViews,
    todayViews,
}: KpiCardsProps) {
    return (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/50 transition-all hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Mai foglalások</span>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Calendar className="h-5 w-5" />
                    </div>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-gray-900 sm:text-4xl">{bookingsToday}</h3>
                    <span className="text-sm font-medium text-gray-500">
                        {bookingsToday > 0 ? "ma érintett kérés" : "ma még nincs kérés"}
                    </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    {pendingRequests > 0
                        ? `${pendingRequests} további függő időpontkérés vár döntésre.`
                        : "Minden időpontkérésed naprakész állapotban van."}
                </p>
                <MiniMeter value={bookingsToday} max={Math.max(bookingsToday + pendingRequests, 3)} />
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/50 transition-all hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Aktív kínálat</span>
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                        <Briefcase className="h-5 w-5" />
                    </div>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-gray-900 sm:text-4xl">{servicesCount}</h3>
                    <span className="text-sm font-medium text-gray-500">szolgáltatás</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    {postsCount > 0
                        ? `${postsCount} aktív bejegyzés támogatja a felfedezhetőséget.`
                        : "Még nincs aktív bejegyzésed, érdemes feltölteni tartalmat."}
                </p>
                <MiniMeter value={postsCount} max={Math.max(servicesCount, postsCount, 3)} />
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/50 transition-all hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Profil látogatók</span>
                    <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                        <Eye className="h-5 w-5" />
                    </div>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-gray-900 sm:text-4xl">{totalViews}</h3>
                    <span className="text-sm font-medium text-gray-500">összes megtekintés</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    {todayViews > 0
                        ? `${todayViews} látogatás érkezett ma a publikus profilodra.`
                        : "Ma még nem érkezett új profilmegtekintés."}
                </p>
                <MiniMeter value={todayViews} max={Math.max(totalViews, todayViews, 5)} />
            </div>
        </div>
    )
}
