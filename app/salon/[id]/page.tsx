"use client"

import { use, useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { CommandHeader } from "@/components/dashboard/command-header"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { TimelineSchedule } from "@/components/dashboard/timeline-schedule"
import { PortfolioVibeWidget } from "@/components/dashboard/portfolio-vibe-widget"
import { useAuth } from "@/lib/auth-context"
import { useSalonData } from "@/hooks/useSalonData"
import { acceptBookingRequest, getSalonBookingRequests, rejectBookingRequest } from "@/lib/actions/salon"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useNotifications } from "@/lib/notification-context"
import { CheckCircle2, Hourglass, XCircle } from "lucide-react"

const STATUS_META: Record<string, { label: string; className: string; icon: typeof Hourglass }> = {
    pending: {
        label: "Függőben",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        icon: Hourglass,
    },
    accepted: {
        label: "Elfogadva",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
    },
    rejected: {
        label: "Elutasítva",
        className: "border-rose-200 bg-rose-50 text-rose-700",
        icon: XCircle,
    },
}

export default function SalonOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()
    const { unreadCount } = useNotifications()
    const [bookingRequests, setBookingRequests] = useState<any[]>([])
    const [requestsLoading, setRequestsLoading] = useState(true)
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)

    const { salon, services, posts, loading } = useSalonData(id, userData?.id)

    useEffect(() => {
        const loadBookingRequests = async () => {
            if (!userData?.id || !id) {
                setRequestsLoading(false)
                return
            }

            try {
                setRequestsLoading(true)
                const requests = await getSalonBookingRequests(id)
                setBookingRequests(requests)
            } catch (error) {
                console.error("Error loading booking requests:", error)
            } finally {
                setRequestsLoading(false)
            }
        }

        loadBookingRequests()
    }, [id, userData?.id])

    const handleRequestAction = async (bookingId: string, status: "accepted" | "rejected") => {
        setUpdatingRequestId(bookingId)
        try {
            if (status === "accepted") {
                await acceptBookingRequest(bookingId)
                toast.success("Az időpontkérés elfogadva.")
            } else {
                await rejectBookingRequest(bookingId)
                toast.success("Az időpontkérés elutasítva.")
            }

            setBookingRequests((current) =>
                current.map((request) =>
                    request.id === bookingId ? { ...request, status } : request
                )
            )
        } catch (error: any) {
            console.error("Error updating booking request:", error)
            toast.error(error?.message || "Nem sikerült frissíteni az időpontkérést.")
        } finally {
            setUpdatingRequestId(null)
        }
    }

    const dashboardStats = useMemo(() => {
        const todayKey = new Date().toDateString()
        const bookingsToday = bookingRequests.filter((request) => new Date(request.date).toDateString() === todayKey).length
        const pendingRequests = bookingRequests.filter((request) => request.status === "pending").length
        const portfolioImages = Array.from(
            new Set(
                [
                    salon?.profileImage,
                    salon?.coverImage,
                    ...(salon?.images || []),
                    ...posts.flatMap((post) => post.images || []),
                ].filter(Boolean) as string[]
            )
        )
        const totalInteractions = posts.reduce((sum, post) => sum + (post._count?.likes || 0) + (post._count?.comments || 0), 0)

        return {
            bookingsToday,
            pendingRequests,
            portfolioImages,
            totalInteractions,
        }
    }, [bookingRequests, posts, salon?.coverImage, salon?.images, salon?.profileImage])

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="flex min-h-[60vh] items-center justify-center p-6">
                    <div className="text-gray-400">Áttekintés betöltése...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="p-6 text-gray-500">A szalon nem található, vagy nincs hozzáférésed.</div>
            </MainLayout>
        )
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full max-w-7xl space-y-8 px-0 py-2 sm:px-2 md:space-y-10 md:p-8 lg:mr-auto">
                <CommandHeader
                    salonName={salon.name}
                    pendingRequests={dashboardStats.pendingRequests}
                    unreadMessages={unreadCount}
                />

                <KpiCards
                    bookingsToday={dashboardStats.bookingsToday}
                    pendingRequests={dashboardStats.pendingRequests}
                    servicesCount={services.length}
                    postsCount={posts.length}
                    portfolioImageCount={dashboardStats.portfolioImages.length}
                    totalInteractions={dashboardStats.totalInteractions}
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="space-y-8 lg:col-span-2">
                        <div className="min-h-[500px] overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-8">
                            <TimelineSchedule bookings={bookingRequests} />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <PortfolioVibeWidget
                            images={dashboardStats.portfolioImages}
                            postsCount={posts.length}
                            servicesCount={services.length}
                            totalInteractions={dashboardStats.totalInteractions}
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-8">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Beérkező időpontkérések</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Itt tudod áttekinteni és jóváhagyni vagy elutasítani a beérkezett foglalási igényeket.
                            </p>
                        </div>
                    </div>

                    {requestsLoading ? (
                        <div className="text-sm text-gray-400">Időpontkérések betöltése...</div>
                    ) : bookingRequests.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                            Még nem érkezett időpontkérés ehhez a szalonhoz.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookingRequests.map((request) => {
                                const statusMeta = STATUS_META[request.status] || STATUS_META.pending
                                const StatusIcon = statusMeta.icon

                                return (
                                    <div
                                        key={request.id}
                                        className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
                                    >
                                        <div className="grid min-w-0 gap-3 md:grid-cols-5">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vendég</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {request.userName || request.userId}
                                                </p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Szolgáltatás</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {request.serviceName || "Nincs megadva"}
                                                </p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Kért dátum</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {new Date(request.date).toLocaleDateString("hu-HU")}
                                                </p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Státusz</p>
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusMeta.className}`}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {statusMeta.label}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Üzenet</p>
                                                <p className="break-words text-sm text-gray-700">
                                                    {request.message || "Nincs külön megjegyzés"}
                                                </p>
                                            </div>
                                        </div>

                                        {request.status === "pending" ? (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleRequestAction(request.id, "accepted")}
                                                    disabled={updatingRequestId === request.id}
                                                >
                                                    {updatingRequestId === request.id ? "Mentés..." : "Elfogadom"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRequestAction(request.id, "rejected")}
                                                    disabled={updatingRequestId === request.id}
                                                >
                                                    Elutasítom
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}
