"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MapPin, Plus, Star, Store } from "lucide-react"

import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { SalonWizard } from "@/components/wizard/SalonWizard"
import { getUserSalons } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { getDashboardSalonHref } from "@/lib/navigation-config"
import { Salon } from "@/lib/salon-types"

type DashboardSalon = Salon & {
    isPublished?: boolean
    publishBlockedReason?: string | null
    subscription?: {
        plan: "FREE" | "STANDARD" | "PREMIUM"
        status: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELLED"
        freeExpiresAt?: string | Date | null
        currentPeriodEnd?: string | Date | null
        cancelAtPeriodEnd?: boolean
    } | null
}

export default function SalonsPage() {
    const { userData } = useAuth()
    const searchParams = useSearchParams()
    const [salons, setSalons] = useState<DashboardSalon[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const fetchSalons = useCallback(async () => {
        if (!userData?.id) return

        try {
            setLoading(true)
            const salonsData = await getUserSalons(userData.id)
            setSalons(salonsData as unknown as DashboardSalon[])
        } catch (error) {
            console.error("Szalonlista betöltési hiba:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    useEffect(() => {
        fetchSalons()
    }, [fetchSalons])

    useEffect(() => {
        if (searchParams.get("create") === "1") {
            setIsCreateModalOpen(true)
        }
    }, [searchParams])

    const handleCreateSuccess = () => {
        fetchSalons()
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft sm:p-8">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div className="max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-wide text-accent-primary">
                                Szalon onboarding
                            </p>
                            <h1 className="mt-3 font-serif text-3xl font-black text-text-primary sm:text-4xl">
                                Szalonjaim
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
                                Itt hozhatsz létre szalont, és innen tudsz belépni a meglévő szalonok kezelőfelületére.
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-12 rounded-full px-6 font-bold"
                        >
                            <Plus className="h-4 w-4" />
                            Új szalon
                        </Button>
                    </div>
                </section>

                {loading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-72 animate-pulse rounded-2xl bg-surface-muted" />
                        ))}
                    </div>
                ) : salons.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border-subtle bg-surface p-10 text-center shadow-soft">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
                            <Store className="h-8 w-8" />
                        </div>
                        <h2 className="font-serif text-2xl font-black text-text-primary">Még nincs regisztrált szalonod</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                            Minden fiók látogatói nézetből indul. Az első szalon létrehozása után megnyílik a szalon konzol, ahol a szolgáltatásokat, képeket, nyitvatartást és foglalási kérelmeket kezelheted.
                        </p>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="mt-6 rounded-full font-bold">
                            Szalon létrehozása
                        </Button>
                    </section>
                ) : (
                    <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {salons.map((salon) => (
                            <Link key={salon.id} href={getDashboardSalonHref(salon.id)} className="group">
                                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                                    <div className="relative h-48 overflow-hidden bg-surface-muted">
                                        {salon.images?.[0] ? (
                                            <Image
                                                src={salon.images[0]}
                                                alt={salon.name}
                                                fill
                                                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-secondary">
                                                <Store className="h-10 w-10" />
                                                <span className="text-xs font-bold uppercase tracking-wide">Nincs kép</span>
                                            </div>
                                        )}
                                        <div className="absolute left-4 top-4">
                                            {salon.publishBlockedReason ? (
                                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 shadow-sm">
                                                    Tiltva
                                                </span>
                                            ) : salon.isPublished ? (
                                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 shadow-sm">
                                                    Publikálva
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600 shadow-sm">
                                                    Nem publikált
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-surface/95 px-3 py-1 shadow-sm backdrop-blur">
                                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                            <span className="text-xs font-black text-text-primary">{salon.rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col p-5">
                                        <h2 className="line-clamp-1 text-xl font-black text-text-primary group-hover:text-accent-primary">
                                            {salon.name}
                                        </h2>
                                        <div className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                                            <span className="line-clamp-2">{salon.city}, {salon.address}</span>
                                        </div>
                                        <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-4">
                                            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                                                {salon.reviewCount} értékelés
                                            </span>
                                            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-primary">
                                                Kezelés
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </section>
                )}

                <SalonWizard
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleCreateSuccess}
                />
            </div>
        </MainLayout>
    )
}
