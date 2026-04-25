"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { ProviderCard } from "@/components/home/provider-card"
import { getUserFavorites } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { Heart, Sparkles } from "lucide-react"
import { AccountPageShell } from "@/components/account/account-page-shell"
import { AccountEmptyState } from "@/components/account/account-empty-state"

export default function FavoritesPage() {
    const { userData } = useAuth()
    const [favorites, setFavorites] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (userData?.id) {
            loadFavorites()
        } else if (userData === null) {
            setLoading(false)
        }
    }, [userData?.id])

    const loadFavorites = async () => {
        try {
            const data = await getUserFavorites(userData!.id)
            setFavorites(data.map((fav: any) => ({
                id: fav.salon.id,
                name: fav.salon.name,
                category: fav.salon.categories?.[0] || "Egyéb",
                rating: fav.salon.rating || 0,
                reviewCount: fav.salon.reviewCount || 0,
                location: fav.salon.city,
                image: fav.salon.coverImage || fav.salon.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
                avatar: fav.salon.profileImage || fav.salon.images?.[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
                languages: fav.salon.languages,
                slug: fav.salon.slug,
            })))
        } catch (error) {
            console.error("Error loading favorites:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <AccountPageShell
                    icon={Heart}
                    title="Kedvenceim"
                    description="Itt találod az elmentett szalonokat."
                >
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-80 animate-pulse rounded-[32px] bg-gray-100" />
                        ))}
                    </div>
                </AccountPageShell>
            </MainLayout>
        )
    }

    if (!userData) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <AccountPageShell
                    icon={Heart}
                    title="Kedvenceim"
                    description="Itt találod az elmentett szalonokat."
                >
                    <AccountEmptyState
                        icon={Heart}
                        title="Jelentkezz be!"
                        description="Jelentkezz be, hogy lásd a kedvenc szolgáltatóidat és egyszerűen foglalhass időpontot."
                    />
                </AccountPageShell>
            </MainLayout>
        )
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <AccountPageShell
                icon={Heart}
                title="Kedvenceim"
                description="Itt találod az elmentett szalonokat."
                badge={
                    <div className="hidden items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm sm:flex">
                        <Sparkles className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-bold text-gray-700">{favorites.length} mentett szalon</span>
                    </div>
                }
            >
                {favorites.length === 0 ? (
                    <AccountEmptyState
                        icon={Heart}
                        title="Még nincs kedvenc szolgáltatód"
                        description="Fedezd fel a legjobb szalonokat és mentsd el őket a szívecske ikonnal!"
                    />
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">
                        {favorites.map((provider) => (
                            <div key={provider.id} className="h-full">
                                <ProviderCard {...provider} />
                            </div>
                        ))}
                    </div>
                )}
            </AccountPageShell>
        </MainLayout>
    )
}
