"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { getCurrentUserBookings } from "@/lib/actions/salon"
import { Calendar, Clock3, Store, CheckCircle2, Hourglass, XCircle } from "lucide-react"
import { AccountPageShell } from "@/components/account/account-page-shell"
import { AccountEmptyState } from "@/components/account/account-empty-state"

type BookingItem = {
    id: string
    date: string | Date
    createdAt?: string | Date
    status: "pending" | "accepted" | "rejected" | string
    salon: {
        id: string
        name: string
        slug: string
        city: string
        profileImage?: string | null
        images?: string[]
    }
    service: {
        id: string
        name: string
    }
}

const STATUS_META: Record<string, { label: string; className: string; description: string; icon: typeof Hourglass }> = {
    pending: {
        label: "Függőben",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        description: "A szalon még nem válaszolt az időpontkérésedre.",
        icon: Hourglass,
    },
    accepted: {
        label: "Elfogadva",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        description: "A szalon visszaigazolta a kérésedet, ez már elfogadott foglalásként kezelhető.",
        icon: CheckCircle2,
    },
    rejected: {
        label: "Elutasítva",
        className: "bg-rose-50 text-rose-700 border-rose-200",
        description: "A szalon most nem tudta vállalni a kért időpontot.",
        icon: XCircle,
    },
}

function getStatusMeta(status: string) {
    return STATUS_META[status] || {
        label: status,
        className: "bg-gray-50 text-gray-700 border-gray-200",
        description: "A foglalás állapota frissült.",
        icon: Hourglass,
    }
}

export function UserBookingsView() {
    const { userData } = useAuth()
    const [bookings, setBookings] = useState<BookingItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadBookings = async () => {
            if (!userData?.id) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const data = await getCurrentUserBookings()
                setBookings(data as BookingItem[])
            } catch (error) {
                console.error("Error loading current user bookings:", error)
            } finally {
                setLoading(false)
            }
        }

        loadBookings()
    }, [userData?.id])

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <AccountPageShell
                icon={Calendar}
                title="Foglalásaim"
                description="Itt látod a saját időpontkéréseid és elfogadott foglalásaid aktuális állapotát."
            >
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-36 animate-pulse rounded-3xl bg-gray-100" />
                        ))}
                    </div>
                ) : bookings.length === 0 ? (
                    <AccountEmptyState
                        icon={Clock3}
                        title="Még nincs időpontkérésed."
                        description="Ha találsz egy szimpatikus szalont, pár kattintással kérhetsz időpontot."
                    />
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => {
                            const statusMeta = getStatusMeta(booking.status)
                            const StatusIcon = statusMeta.icon

                            return (
                                <div
                                    key={booking.id}
                                    className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 space-y-3">
                                                <div className="flex items-center gap-2 text-gray-900">
                                                    <Store className="h-4 w-4 shrink-0 text-primary" />
                                                    <span className="truncate font-bold">{booking.salon.name}</span>
                                                </div>

                                                <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                                                    <div>
                                                        <span className="font-semibold text-gray-900">Szolgáltatás:</span>{" "}
                                                        {booking.service?.name || "Nincs megadva"}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-900">Dátum:</span>{" "}
                                                        {new Date(booking.date).toLocaleDateString("hu-HU")}
                                                    </div>
                                                    {booking.createdAt && (
                                                        <div className="sm:col-span-2">
                                                            <span className="font-semibold text-gray-900">Létrehozva:</span>{" "}
                                                            {new Date(booking.createdAt).toLocaleDateString("hu-HU")}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="sm:pl-4">
                                                <span
                                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusMeta.className}`}
                                                >
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {statusMeta.label}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-500">{statusMeta.description}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </AccountPageShell>
        </MainLayout>
    )
}
