"use client"

import { CalendarClock, Clock3, CheckCircle2, XCircle, Hourglass } from "lucide-react"

type ScheduleItem = {
    id: string
    userName: string | null
    serviceName: string | null
    date: string | Date
    status: string
    message?: string | null
}

type TimelineScheduleProps = {
    bookings: ScheduleItem[]
}

const STATUS_META: Record<string, { label: string; className: string; icon: typeof Hourglass }> = {
    pending: {
        label: "Függőben",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Hourglass,
    },
    accepted: {
        label: "Elfogadva",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
    },
    rejected: {
        label: "Elutasítva",
        className: "bg-rose-50 text-rose-700 border-rose-200",
        icon: XCircle,
    },
}

export function TimelineSchedule({ bookings }: TimelineScheduleProps) {
    const upcomingBookings = [...bookings]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Következő időpontkérések</h3>
                    <p className="text-sm text-gray-500">A legközelebbi beérkezett foglalási kérések és állapotaik.</p>
                </div>
                <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                    {bookings.length} összes kérés
                </div>
            </div>

            {upcomingBookings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                        <CalendarClock className="h-6 w-6 text-gray-300" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Még nincs időpontkérés</h4>
                    <p className="mt-2 text-sm text-gray-500">Amint érkezik új kérés, itt rögtön látni fogod.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {upcomingBookings.map((item) => {
                        const statusMeta = STATUS_META[item.status] || STATUS_META.pending
                        const StatusIcon = statusMeta.icon

                        return (
                            <div key={item.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">
                                                {item.userName || "Ismeretlen vendég"}
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusMeta.className}`}
                                            >
                                                <StatusIcon className="h-3.5 w-3.5" />
                                                {statusMeta.label}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                                            <span className="flex items-center gap-1.5">
                                                <Clock3 className="h-4 w-4 text-primary" />
                                                {new Date(item.date).toLocaleDateString("hu-HU")}
                                            </span>
                                            <span>{item.serviceName || "Nincs megadott szolgáltatás"}</span>
                                        </div>

                                        <p className="text-sm text-gray-600">
                                            {item.message?.trim() || "Nincs külön megjegyzés a kéréshez."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
