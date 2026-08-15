"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarClock, Heart, MessageSquare, Plus, Store } from "lucide-react"

import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { getMyBookings, getUserFavorites, getUserMessages } from "@/lib/actions/salon"
import { getBookingStatusLabel } from "@/lib/booking/booking-policy"
import { useAuth } from "@/lib/auth-context"

type Booking = Awaited<ReturnType<typeof getMyBookings>>[number]
type Message = Awaited<ReturnType<typeof getUserMessages>>[number]
type Favorite = Awaited<ReturnType<typeof getUserFavorites>>[number]

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("hu-HU", {
        month: "short",
        day: "numeric",
    })
}

export default function DashboardPage() {
    const { userData } = useAuth()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [loading, setLoading] = useState(true)

    const loadDashboard = useCallback(async () => {
        if (!userData?.id) return

        try {
            setLoading(true)
            const [bookingData, messageData, favoriteData] = await Promise.all([
                getMyBookings(),
                getUserMessages(userData.id),
                getUserFavorites(userData.id),
            ])

            setBookings(bookingData)
            setMessages(messageData)
            setFavorites(favoriteData)
        } catch (error) {
            console.error("Dashboard betöltési hiba:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    useEffect(() => {
        loadDashboard()
    }, [loadDashboard])

    const unreadMessages = useMemo(
        () => messages.filter((message) => !message.isRead && message.receiverId === userData?.id).length,
        [messages, userData?.id]
    )
    const recentBookings = bookings.slice(0, 3)
    const latestMessages = messages.slice(0, 3)
    const isProvider = userData?.role === "provider" || userData?.role === "admin"

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft sm:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-wide text-accent-primary">
                                Fiók áttekintés
                            </p>
                            <h1 className="mt-3 font-serif text-3xl font-black text-text-primary sm:text-4xl">
                                Szia, {userData?.name || "üdv újra"}!
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
                                Itt látod a saját foglalásaidat, üzeneteidet és kedvenc szalonjaidat. A szalonkezelés külön provider nézetben érhető el.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            {isProvider ? (
                                <Button asChild className="h-12 rounded-full px-6 font-bold">
                                    <Link href="/dashboard/provider">
                                        <Store className="h-4 w-4" />
                                        Provider áttekintés
                                    </Link>
                                </Button>
                            ) : (
                                <Button asChild variant="outline" className="h-12 rounded-full px-6 font-bold">
                                    <Link href="/dashboard/salons?create=1">
                                        <Plus className="h-4 w-4" />
                                        Szalon létrehozása
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    <DashboardMetric title="Foglalásaim" value={bookings.length} icon={CalendarClock} loading={loading} />
                    <DashboardMetric title="Olvasatlan üzenetek" value={unreadMessages} icon={MessageSquare} loading={loading} />
                    <DashboardMetric title="Kedvencek" value={favorites.length} icon={Heart} loading={loading} />
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <Panel
                        title="Legutóbbi foglalások"
                        description="A saját időpontkéréseid állapota."
                        href="/dashboard/bookings"
                        action="Összes"
                    >
                        {loading ? (
                            <SkeletonRows />
                        ) : recentBookings.length > 0 ? (
                            <div className="space-y-3">
                                {recentBookings.map((booking) => (
                                    <Link
                                        key={booking.id}
                                        href="/dashboard/bookings"
                                        className="block rounded-2xl border border-border-subtle bg-surface-elevated p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-bold text-text-primary">{booking.salon.name}</p>
                                            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-primary">
                                                {getBookingStatusLabel(booking.status)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-text-secondary">
                                            {booking.service.name} · {formatDate(booking.date)} · {booking.time}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title="Még nincs foglalásod"
                                description="Fedezz fel szalonokat, és küldj időpontkérést pár kattintással."
                                href="/providers"
                                action="Szalonok keresése"
                            />
                        )}
                    </Panel>

                    <Panel
                        title="Üzenetek"
                        description="Legutóbbi beszélgetések és értesítések."
                        href="/dashboard/messages"
                        action="Megnyitás"
                    >
                        {loading ? (
                            <SkeletonRows />
                        ) : latestMessages.length > 0 ? (
                            <div className="space-y-3">
                                {latestMessages.map((message) => (
                                    <Link
                                        key={message.id}
                                        href="/dashboard/messages"
                                        className="block rounded-2xl border border-border-subtle bg-surface-elevated p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft"
                                    >
                                        <p className="truncate font-bold text-text-primary">
                                            {message.senderId === userData?.id ? message.receiver.name : message.sender.name || "Üzenet"}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{message.content}</p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title="Nincs üzeneted"
                                description="Itt jelennek meg a szalonoktól és a foglalásoktól érkező üzenetek."
                                href="/providers"
                                action="Felfedezés"
                            />
                        )}
                    </Panel>
                </section>

                <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-serif text-2xl font-black text-text-primary">Kedvenc szalonok</h2>
                            <p className="text-sm text-text-secondary">A mentett szalonjaid gyors elérése.</p>
                        </div>
                        <Button asChild variant="outline" className="h-11 rounded-full font-bold">
                            <Link href="/dashboard/favorites">Kedvencek megnyitása</Link>
                        </Button>
                    </div>
                    {!loading && favorites.length === 0 && (
                        <div className="mt-5">
                            <EmptyState
                                title="Még nincs kedvenced"
                                description="Mentsd el azokat a szalonokat, ahová később visszatérnél."
                                href="/providers"
                                action="Szalonok böngészése"
                            />
                        </div>
                    )}
                </section>
            </div>
        </MainLayout>
    )
}

function DashboardMetric({
    title,
    value,
    icon: Icon,
    loading,
}: {
    title: string
    value: number
    icon: React.ElementType
    loading: boolean
}) {
    return (
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-text-secondary">{title}</p>
            </div>
            <p className="mt-1 text-3xl font-black text-text-primary">{loading ? "..." : value}</p>
        </div>
    )
}

function Panel({
    title,
    description,
    href,
    action,
    children,
}: {
    title: string
    description: string
    href: string
    action: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <h2 className="font-serif text-2xl font-black text-text-primary">{title}</h2>
                    <p className="text-sm text-text-secondary">{description}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href={href}>{action}</Link>
                </Button>
            </div>
            {children}
        </div>
    )
}

function SkeletonRows() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
            ))}
        </div>
    )
}

function EmptyState({
    title,
    description,
    href,
    action,
}: {
    title: string
    description: string
    href: string
    action: string
}) {
    return (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-elevated p-6 text-center">
            <p className="font-bold text-text-primary">{title}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-text-secondary">{description}</p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
                <Link href={href}>{action}</Link>
            </Button>
        </div>
    )
}
