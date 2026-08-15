"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { Check, X } from "lucide-react"
import { toast } from "sonner"

import {
    acceptBookingRequest,
    getSalonBookingRequests,
    rejectBookingRequest,
} from "@/lib/actions/salon"
import { getBookingStatusLabel } from "@/lib/booking/booking-policy"
import { Button } from "@/components/ui/button"

type BookingRequest = Awaited<ReturnType<typeof getSalonBookingRequests>>[number]

interface BookingRequestsProps {
    salonId: string
}

function formatBookingDate(date: Date | string) {
    return new Date(date).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

function legacyStatusLabel(status: string) {
    const labels: Record<string, string> = {
        pending: "Függőben",
        confirmed: "Elfogadva",
        cancelled: "Elutasítva",
        completed: "Teljesítve",
    }
    return getBookingStatusLabel(status) || labels[status] || status
}

export function BookingRequests({ salonId }: BookingRequestsProps) {
    const [bookings, setBookings] = useState<BookingRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const loadBookings = useCallback(async () => {
        try {
            setLoading(true)
            const result = await getSalonBookingRequests(salonId)
            setBookings(result)
        } catch (error) {
            console.error("Error loading booking requests:", error)
            toast.error("Nem sikerült betölteni a foglalási kéréseket.")
        } finally {
            setLoading(false)
        }
    }, [salonId])

    useEffect(() => {
        loadBookings()
    }, [loadBookings])

    const handleStatusChange = (bookingId: string, action: "accept" | "reject") => {
        setActiveBookingId(bookingId)
        startTransition(async () => {
            try {
                const updated = action === "accept"
                    ? await acceptBookingRequest(bookingId)
                    : await rejectBookingRequest(bookingId)

                setBookings((current) => current.map((booking) => (
                    booking.id === bookingId ? updated : booking
                )))
                toast.success(action === "accept" ? "Foglalási kérés elfogadva." : "Foglalási kérés elutasítva.")
            } catch (error) {
                console.error("Error updating booking request:", error)
                toast.error(error instanceof Error ? error.message : "Nem sikerült módosítani a foglalási kérést.")
            } finally {
                setActiveBookingId(null)
            }
        })
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-bold text-gray-900">Foglalási kérések</h3>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {bookings.filter((booking) => booking.status === "pending").length} függőben
                </span>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-500">
                    Foglalási kérések betöltése...
                </div>
            ) : bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                    Még nincs foglalási kérés ehhez a szalonhoz.
                </div>
            ) : (
                <div className="space-y-3">
                    {bookings.map((booking) => {
                        const isActionDisabled = isPending && activeBookingId === booking.id
                        const isPendingBooking = booking.status === "pending"

                        return (
                            <div key={booking.id} data-testid={`provider-booking-${booking.id}`} className="rounded-2xl border border-gray-100 bg-white p-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-bold text-gray-900">
                                                {booking.user.name || "Névtelen vendég"}
                                            </h4>
                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                                                {legacyStatusLabel(booking.status)}
                                            </span>
                                        </div>
                                        <p className="break-all text-sm text-gray-500">{booking.user.email || "Nincs email megadva"}</p>
                                        <p className="text-sm font-medium text-gray-700">{booking.service.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatBookingDate(booking.date)} · {booking.time}
                                        </p>
                                    </div>

                                    {isPendingBooking && (
                                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                                            <Button
                                                size="sm"
                                                data-testid={`accept-booking-${booking.id}`}
                                                onClick={() => handleStatusChange(booking.id, "accept")}
                                                disabled={isActionDisabled}
                                                className="gap-1"
                                            >
                                                <Check className="h-4 w-4" />
                                                Elfogadás
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                data-testid={`reject-booking-${booking.id}`}
                                                onClick={() => handleStatusChange(booking.id, "reject")}
                                                disabled={isActionDisabled}
                                                className="gap-1"
                                            >
                                                <X className="h-4 w-4" />
                                                Elutasítás
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
