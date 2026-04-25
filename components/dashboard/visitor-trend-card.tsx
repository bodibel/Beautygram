"use client"

import { Eye } from "lucide-react"

type VisitorPoint = {
    date: string
    label: string
    fullLabel: string
    count: number
}

type VisitorTrendCardProps = {
    totalViews: number
    todayViews: number
    series: VisitorPoint[]
}

export function VisitorTrendCard({ totalViews, todayViews, series }: VisitorTrendCardProps) {
    const maxCount = Math.max(...series.map((point) => point.count), 1)

    return (
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                            <Eye className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Profilmegtekintések</h2>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        Napos bontásban látod, hogyan alakul a publikus szalonoldalad forgalma.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Összesen</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{totalViews}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ma</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{todayViews}</p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                {series.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                        Még nincs megjeleníthető látogatási adat.
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-3">
                        {series.map((point) => (
                            <div key={point.date} className="flex min-h-[220px] flex-col justify-end gap-3">
                                <div className="flex flex-1 items-end justify-center rounded-2xl bg-gray-50 px-2 py-3">
                                    <div
                                        className="w-full rounded-xl bg-gradient-to-t from-primary to-primary/70 transition-all"
                                        style={{ height: `${Math.max((point.count / maxCount) * 140, point.count > 0 ? 16 : 8)}px` }}
                                        title={`${point.fullLabel}: ${point.count} megtekintés`}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-900">{point.count}</p>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{point.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
