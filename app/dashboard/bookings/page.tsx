"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, X } from "lucide-react"
import { toast } from "sonner"

import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { cancelMyBooking, getMyBookings } from "@/lib/actions/salon"
import { getBookingStatusLabel } from "@/lib/booking/booking-policy"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

type MyBooking = Awaited<ReturnType<typeof getMyBookings>>[number]

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

function statusClass(status: string) {
    if (status === "confirmed") return "bg-green-50 text-green-700 border-green-100"
    if (status === "cancelled") return "bg-red-50 text-red-700 border-red-100"
    if (status === "completed") return "bg-blue-50 text-blue-700 border-blue-100"
    return "bg-yellow-50 text-yellow-700 border-yellow-100"
}

export default function MyBookingsPage() {
    const { userData } = useAuth()
    const [bookings, setBookings] = useState<MyBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)

    const loadBookings = useCallback(async () => {
        if (!userData?.id) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const result = await getMyBookings()
            setBookings(result)
        } catch (error) {
            console.error("Error loading bookings:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    useEffect(() => {
        loadBookings()
    }, [loadBookings])

    const handleCancelBooking = async (bookingId: string) => {
        try {
            setCancellingBookingId(bookingId)
            const updatedBooking = await cancelMyBooking(bookingId)
            setBookings((currentBookings) =>
                currentBookings.map((booking) => (booking.id === bookingId ? updatedBooking : booking))
            )
            toast.success("Az idopontkerest visszavontad.")
        } catch (error) {
            console.error("Error cancelling booking:", error)
            toast.error(error instanceof Error ? error.message : "Nem sikerult visszavonni az idopontkerest.")
        } finally {
            setCancellingBookingId(null)
        }
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                    <div className="h-10 w-64 rounded-xl bg-gray-100 animate-pulse mb-8" />
                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-32 rounded-3xl bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                </div>
            </MainLayout>
        )
    }

    if (!userData) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="min-h-[60vh] flex items-center justify-center p-4">
                    <div className="max-w-md text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                            <CalendarClock className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-3">Bejelentkezés szükséges</h1>
                        <p className="text-gray-500 font-medium">A foglalásaid megtekintéséhez jelentkezz be.</p>
                    </div>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <CalendarClock className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Foglalásaim</h1>
                        <p className="text-sm font-medium text-gray-500">Időpontkérések és visszaigazolások</p>
                    </div>
                </div>

                {bookings.length === 0 ? (
                    <div className="rounded-[32px] border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
                        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                            <CalendarClock className="h-10 w-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Még nincs foglalásod</h2>
                        <p className="text-gray-500 font-medium">Itt fognak megjelenni a szalonokhoz küldött időpontkéréseid.</p>
                        <Button asChild className="mt-6 rounded-full px-6 font-bold">
                            <Link href="/providers">Szalonok keresése</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <div key={booking.id} data-testid={`visitor-booking-${booking.id}`} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={`/profile/${booking.salon.slug}`}
                                                className="text-lg font-black text-gray-900 hover:text-primary transition-colors"
                                            >
                                                {booking.salon.name}
                                            </Link>
                                            <span className={cn(
                                                "rounded-full border px-3 py-1 text-xs font-bold",
                                                statusClass(booking.status)
                                            )}>
                                                {getBookingStatusLabel(booking.status)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700">{booking.service.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(booking.date)} · {booking.time}
                                        </p>
                                    </div>
                                    {booking.status === "pending" && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full md:w-auto"
                                            disabled={cancellingBookingId === booking.id}
                                            onClick={() => handleCancelBooking(booking.id)}
                                        >
                                            <X className="h-4 w-4" />
                                            {cancellingBookingId === booking.id ? "Visszavonas..." : "Visszavonom"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
