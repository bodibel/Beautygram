"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
    Mail,
    Shield,
    Calendar,
    Edit2,
    Heart,
    Store,
    LogOut,
    ArrowRight,
    MessageSquare,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState, type ElementType } from "react"
import { ProfileEditModal } from "@/components/dashboard/modals/ProfileEditModal"
import { signOut } from "next-auth/react"
import { AccountPageShell } from "@/components/account/account-page-shell"
import { getCurrentUserBookings, getUserFavorites, getUserMessages, getUserSalons } from "@/lib/actions/salon"
import { useNotifications } from "@/lib/notification-context"

type ProfileStats = {
    favoritesCount: number
    bookingsCount: number
    pendingBookingsCount: number
    acceptedBookingsCount: number
    threadCount: number
    salonCount: number
}

type ActionCardProps = {
    title: string
    value: string
    subtitle: string
    detail: string
    icon: ElementType
    iconClassName: string
    href: string
    buttonLabel: string
}

function ActionCard({
    title,
    value,
    subtitle,
    detail,
    icon: Icon,
    iconClassName,
    href,
    buttonLabel,
}: ActionCardProps) {
    return (
        <div className="flex h-full flex-col rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md sm:p-6">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}>
                <Icon className="h-5 w-5" />
            </div>

            <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-2xl font-black tracking-tight text-gray-900">{value}</p>
                <p className="text-sm font-medium text-primary">{subtitle}</p>
                <p className="min-h-[40px] text-sm leading-5 text-gray-500">{detail}</p>
            </div>

            <Button asChild variant="outline" className="mt-5 w-full rounded-xl border-gray-200 sm:w-auto">
                <Link href={href}>
                    {buttonLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
    )
}

export default function MyProfilePage() {
    const { user, userData, loading } = useAuth()
    const { unreadCount } = useNotifications()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [stats, setStats] = useState<ProfileStats>({
        favoritesCount: 0,
        bookingsCount: 0,
        pendingBookingsCount: 0,
        acceptedBookingsCount: 0,
        threadCount: 0,
        salonCount: 0,
    })

    useEffect(() => {
        const loadProfileStats = async () => {
            if (!userData?.id) return

            try {
                const [favorites, bookings, messages, salons] = await Promise.all([
                    getUserFavorites(userData.id),
                    getCurrentUserBookings(),
                    getUserMessages(userData.id),
                    getUserSalons(userData.id),
                ])

                const uniqueThreadIds = new Set(
                    messages.map((message: any) => (message.senderId === userData.id ? message.receiverId : message.senderId))
                )

                setStats({
                    favoritesCount: favorites.length,
                    bookingsCount: bookings.length,
                    pendingBookingsCount: bookings.filter((booking: any) => booking.status === "pending").length,
                    acceptedBookingsCount: bookings.filter((booking: any) => booking.status === "accepted").length,
                    threadCount: uniqueThreadIds.size,
                    salonCount: salons.length,
                })
            } catch (error) {
                console.error("Error loading profile stats:", error)
            }
        }

        loadProfileStats()
    }, [userData?.id])

    const memberSince = useMemo(() => "Nincs adat", [])

    if (loading || (user && !userData)) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                    <p className="font-medium text-gray-400">Profil betöltése...</p>
                </div>
            </MainLayout>
        )
    }

    if (!userData) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                    <p className="font-medium text-gray-400">Kérlek jelentkezz be a profilod megtekintéséhez.</p>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <AccountPageShell
                icon={Shield}
                title="Profilom"
                description="Személyes adataid és fiókbeállításaid kezelése."
            >
                <div className="space-y-6">
                    <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md sm:rounded-[32px] sm:p-8">
                        <div className="mb-6 flex flex-col items-start gap-5 sm:mb-8 sm:flex-row sm:items-center sm:gap-6">
                            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent-warm text-3xl font-black text-white shadow-lg shadow-primary/20 sm:h-24 sm:w-24">
                                {userData.name?.[0] || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{userData.name}</h2>
                                <p className="flex items-start gap-2 break-all text-sm text-gray-500 sm:text-base">
                                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                                    {userData.email}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full rounded-xl border-gray-200 sm:w-auto"
                                onClick={() => setIsEditModalOpen(true)}
                            >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Szerkesztés
                            </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                <div className="mb-1 flex items-center gap-3">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Jogosultság</span>
                                </div>
                                <p className="font-bold capitalize text-gray-900">
                                    {userData.role === "provider" ? "Szolgáltató" : "Látogató"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                <div className="mb-1 flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Tagság kezdete</span>
                                </div>
                                <p className="font-bold text-gray-900">{memberSince}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <ActionCard
                            title="Üzenetek"
                            value={`${stats.threadCount}`}
                            subtitle={unreadCount > 0 ? `${unreadCount} új üzeneted érkezett` : "Nincs új üzeneted"}
                            detail="Itt látod az összes beszélgetésedet és az új értesítéseket."
                            icon={MessageSquare}
                            iconClassName="bg-primary/10 text-primary"
                            href="/dashboard/messages"
                            buttonLabel="Megnyitás"
                        />

                        <ActionCard
                            title="Foglalások"
                            value={`${stats.bookingsCount}`}
                            subtitle={
                                stats.pendingBookingsCount > 0
                                    ? `${stats.pendingBookingsCount} függő kérésed van`
                                    : stats.acceptedBookingsCount > 0
                                        ? `${stats.acceptedBookingsCount} elfogadott foglalásod van`
                                        : "Még nincs foglalásod"
                            }
                            detail="Kövesd itt az időpontkéréseid és visszaigazolt foglalásaid állapotát."
                            icon={Calendar}
                            iconClassName="bg-amber-50 text-amber-600"
                            href="/account/bookings"
                            buttonLabel="Megnyitás"
                        />

                        <ActionCard
                            title="Kedvencek"
                            value={`${stats.favoritesCount}`}
                            subtitle={stats.favoritesCount > 0 ? "Mentett szalonjaid elérhetők" : "Még nincs mentett kedvenced"}
                            detail="Gyorsan visszatérhetsz a kedvenc szalonjaidhoz és szolgáltatóidhoz."
                            icon={Heart}
                            iconClassName="bg-rose-50 text-rose-500"
                            href="/dashboard/favorites"
                            buttonLabel="Megnyitás"
                        />

                        <ActionCard
                            title="Vállalkozásom"
                            value={`${stats.salonCount}`}
                            subtitle={
                                userData.role === "provider"
                                    ? stats.salonCount > 0
                                        ? `${stats.salonCount} szalon tartozik hozzád`
                                        : "A szolgáltatói felület készen áll"
                                    : "Indítsd el a szolgáltatói profilodat"
                            }
                            detail={
                                userData.role === "provider"
                                    ? "Kezeld a saját szalonod, szolgáltatásaid és vállalkozási beállításaid."
                                    : "Itt tudod elindítani a szolgáltatói onboardingot és létrehozni az első szalonodat."
                            }
                            icon={Store}
                            iconClassName="bg-blue-50 text-blue-600"
                            href="/dashboard/salons"
                            buttonLabel={userData.role === "provider" ? "Megnyitás" : "Indítás"}
                        />
                    </div>

                    <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-gray-900/5 sm:rounded-[32px] sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
                                        <LogOut className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Kijelentkezés</h3>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">Biztonságosan kijelentkezhetsz a fiókodból ezen az eszközön.</p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full rounded-xl border-gray-200 text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto"
                                onClick={() => signOut({ callbackUrl: "/" })}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Kijelentkezés
                            </Button>
                        </div>
                    </div>
                </div>
            </AccountPageShell>

            <ProfileEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                userData={userData}
            />
        </MainLayout>
    )
}
