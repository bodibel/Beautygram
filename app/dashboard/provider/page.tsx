"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarClock, Plus, Store } from "lucide-react"

import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { getSalonBookingRequests, getUserSalons } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { getDashboardSalonHref } from "@/lib/navigation-config"

type UserSalon = Awaited<ReturnType<typeof getUserSalons>>[number]
type BookingRequest = Awaited<ReturnType<typeof getSalonBookingRequests>>[number]

export default function ProviderDashboardPage() {
    const { userData } = useAuth()
    const [salons, setSalons] = useState<UserSalon[]>([])
    const [pendingRequests, setPendingRequests] = useState<BookingRequest[]>([])
    const [loading, setLoading] = useState(true)

    const loadProviderDashboard = useCallback(async () => {
        if (!userData?.id) return

        try {
            setLoading(true)
            const salonData = await getUserSalons(userData.id)
            setSalons(salonData)

            const requestGroups = await Promise.all(
                salonData.map(async (salon) => {
                    try {
                        return await getSalonBookingRequests(salon.id)
                    } catch {
                        return []
                    }
                })
            )
            setPendingRequests(requestGroups.flat().filter((booking) => booking.status === "pending"))
        } catch (error) {
            console.error("Provider dashboard betöltési hiba:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    useEffect(() => {
        loadProviderDashboard()
    }, [loadProviderDashboard])

    const primarySalon = salons[0]
    const totalReviews = useMemo(
        () => salons.reduce((sum, salon) => sum + (salon.reviewCount || 0), 0),
        [salons]
    )

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft sm:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-wide text-accent-primary">
                                Provider áttekintés
                            </p>
                            <h1 className="mt-3 font-serif text-3xl font-black text-text-primary sm:text-4xl">
                                Szalonkezelés egy helyen
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
                                Itt látod a saját szalonjaidat és a függőben lévő foglalási kérelmeket. A részletes szerkesztés továbbra is a szalon konzolban érhető el.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button asChild variant="outline" className="h-12 rounded-full px-6 font-bold">
                                <Link href="/dashboard/salons?create=1">
                                    <Plus className="h-4 w-4" />
                                    Szalon létrehozása
                                </Link>
                            </Button>
                            {primarySalon && (
                                <Button asChild className="h-12 rounded-full px-6 font-bold">
                                    <Link href={getDashboardSalonHref(primarySalon.id)}>
                                        <Store className="h-4 w-4" />
                                        Szalon konzol
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    <Metric label="Szalonok" value={salons.length} loading={loading} />
                    <Metric label="Függő kérelmek" value={pendingRequests.length} loading={loading} />
                    <Metric label="Értékelések" value={totalReviews} loading={loading} />
                </section>

                {loading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-44 animate-pulse rounded-2xl bg-surface-muted" />
                        ))}
                    </div>
                ) : salons.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border-subtle bg-surface p-8 text-center shadow-soft">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
                            <Store className="h-7 w-7" />
                        </div>
                        <h2 className="mt-5 font-serif text-2xl font-black text-text-primary">Még nincs szalonod</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                            Hozd létre az első szalonodat, és utána itt jelennek meg a kezelési belépők, kérelmek és gyors összefoglalók.
                        </p>
                        <Button asChild className="mt-6 rounded-full font-bold">
                            <Link href="/dashboard/salons?create=1">Szalon létrehozása</Link>
                        </Button>
                    </section>
                ) : (
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {salons.map((salon) => {
                            const salonPending = pendingRequests.filter((booking) => booking.salonId === salon.id).length
                            return (
                                <Link
                                    key={salon.id}
                                    href={getDashboardSalonHref(salon.id)}
                                    className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-black text-text-primary">{salon.name}</h2>
                                            <p className="mt-1 text-sm text-text-secondary">{salon.city || "Nincs város megadva"}</p>
                                        </div>
                                        <Store className="h-5 w-5 text-accent-primary" />
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-xl bg-surface-elevated p-3">
                                            <p className="text-text-secondary">Függő kérelmek</p>
                                            <p className="mt-1 text-xl font-black text-text-primary">{salonPending}</p>
                                        </div>
                                        <div className="rounded-xl bg-surface-elevated p-3">
                                            <p className="text-text-secondary">Értékelés</p>
                                            <p className="mt-1 text-xl font-black text-text-primary">{salon.rating.toFixed(1)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-5 flex items-center gap-2 text-sm font-bold text-accent-primary">
                                        <CalendarClock className="h-4 w-4" />
                                        Kezelés megnyitása
                                    </div>
                                </Link>
                            )
                        })}
                    </section>
                )}
            </div>
        </MainLayout>
    )
}

function Metric({ label, value, loading }: { label: string; value: number; loading: boolean }) {
    return (
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft">
            <p className="text-sm font-bold text-text-secondary">{label}</p>
            <p className="mt-2 text-3xl font-black text-text-primary">{loading ? "..." : value}</p>
        </div>
    )
}
