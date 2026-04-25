"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Plus, MapPin, Star, Store } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Salon } from "@/lib/salon-types"
import { getUserSalons } from "@/lib/actions/salon"
import Link from "next/link"
import { SalonWizard } from "@/components/wizard/SalonWizard"
import { SubscriptionBadge } from "@/components/dashboard/SubscriptionBadge"
import { AccountPageShell } from "@/components/account/account-page-shell"
import { AccountEmptyState } from "@/components/account/account-empty-state"

export default function SalonsPage() {
    const { userData } = useAuth()
    const [salons, setSalons] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const isOnboardingOnly = userData?.role === "visitor" && salons.length === 0
    const hasSalon = salons.length > 0
    const primarySalon = salons[0]

    const fetchSalons = useCallback(async () => {
        if (!userData?.id) return

        try {
            const salonsData = await getUserSalons(userData.id)
            setSalons(salonsData as unknown as Salon[])
        } catch (error) {
            console.error("Error fetching salons:", error)
        } finally {
            setLoading(false)
        }
    }, [userData])

    useEffect(() => {
        fetchSalons()
    }, [fetchSalons])

    const handleCreateSuccess = () => {
        fetchSalons()
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <AccountPageShell
                icon={Store}
                title={isOnboardingOnly ? "Hozd létre az első szalonodat" : "Szalonjaim"}
                description={
                    isOnboardingOnly
                        ? "Itt tudod elindítani a szolgáltatói onboardingot és létrehozni az első szalonprofilodat."
                        : "Kezeld a regisztrált szépségszalonjaidat."
                }
                actions={
                    hasSalon && primarySalon ? (
                        <Button asChild className="h-12 rounded-2xl bg-primary px-6 text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary hover:-translate-y-0.5">
                            <Link href={`/salon/${primarySalon.id}`}>Szalon kezelése</Link>
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-12 rounded-2xl bg-primary px-6 text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary hover:-translate-y-0.5"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            {isOnboardingOnly ? "Szalon létrehozása" : "Új szalon hozzáadása"}
                        </Button>
                    )
                }
            >
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                ) : salons.length === 0 ? (
                    <AccountEmptyState
                        icon={Store}
                        title={isOnboardingOnly ? "Indítsd el a szolgáltatói profilodat" : "Még nincs regisztrált szalonod"}
                        description={
                            isOnboardingOnly
                                ? "Hozd létre az első szalonodat, hogy megjelenhess a platformon és fogadhass üzeneteket, megkereséseket."
                                : "Hozd létre az első szalonodat, hogy elkezdd hirdetni a szolgáltatásaidat és fogadd az ügyfeleket."
                        }
                        action={
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                variant="outline"
                                className="rounded-xl border-gray-200"
                            >
                                Szalon létrehozása
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {salons.map((salon) => (
                            <Link key={salon.id} href={`/salon/${salon.id}`} className="group">
                                <div className="flex h-full flex-col overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-gray-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-primary/10">
                                    <div className="relative h-56 overflow-hidden bg-gray-50">
                                        {salon.images?.[0] ? (
                                            <img
                                                src={salon.images[0]}
                                                alt={salon.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-300">
                                                <Store className="h-10 w-10" />
                                                <span className="text-xs font-medium uppercase tracking-widest">Nincs kép</span>
                                            </div>
                                        )}
                                        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-xl bg-white/95 px-2 py-1 shadow-sm backdrop-blur">
                                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                            <span className="text-xs font-black text-gray-900">{salon.rating.toFixed(1)}</span>
                                        </div>
                                        {salon.subscription && (
                                            <div className="absolute left-4 top-4">
                                                <SubscriptionBadge
                                                    plan={salon.subscription.plan}
                                                    status={salon.subscription.status}
                                                    freeExpiresAt={salon.subscription.freeExpiresAt}
                                                    currentPeriodEnd={salon.subscription.currentPeriodEnd}
                                                    cancelAtPeriodEnd={salon.subscription.cancelAtPeriodEnd}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-1 flex-col p-6">
                                        <h3 className="mb-2 line-clamp-1 text-xl font-bold text-gray-900 transition-colors group-hover:text-primary">{salon.name}</h3>
                                        <div className="mb-4 flex items-start gap-1.5 text-sm text-gray-500">
                                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                            <span className="line-clamp-2">{salon.city}, {salon.address}</span>
                                        </div>
                                        <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-4">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                {salon.reviewCount} értékelés
                                            </span>
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 transition-all group-hover:bg-primary group-hover:text-white">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <SalonWizard
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleCreateSuccess}
                />
            </AccountPageShell>
        </MainLayout>
    )
}
