"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { ProviderCard } from "@/components/home/provider-card"
import { Button } from "@/components/ui/button"
import { getUserFavorites } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { Heart, Sparkles } from "lucide-react"

type FavoriteProvider = {
    id: string
    name: string
    category: string
    rating: number
    reviewCount: number
    location: string
    image: string
    avatar: string
    languages?: string[]
    slug: string
}

export default function FavoritesPage() {
    const { userData } = useAuth()
    const [favorites, setFavorites] = useState<FavoriteProvider[]>([])
    const [loading, setLoading] = useState(true)

    const loadFavorites = useCallback(async () => {
        if (!userData?.id) return

        try {
            const data = await getUserFavorites(userData.id)
            setFavorites(data.map((fav): FavoriteProvider => ({
                id: fav.salon.id,
                name: fav.salon.name,
                category: fav.salon.categories?.[0] || "Egyéb",
                rating: fav.salon.rating || 0,
                reviewCount: fav.salon.reviewCount || 0,
                location: fav.salon.city,
                image: fav.salon.coverImage || fav.salon.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
                avatar: fav.salon.profileImage || fav.salon.images?.[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
                languages: fav.salon.languages,
                slug: fav.salon.slug
            })))
        } catch (error) {
            console.error("Error loading favorites:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    useEffect(() => {
        if (userData?.id) {
            loadFavorites()
        } else if (userData === null) {
            setLoading(false)
        }
    }, [loadFavorites, userData])

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Heart className="h-6 w-6 fill-primary" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Kedvenceim</h1>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                        {[1, 2].map(i => (
                            <div key={i} className="h-80 rounded-3xl bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                </div>
            </MainLayout>
        )
    }

    if (!userData) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                    <div className="text-center max-w-md mx-auto">
                        <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="h-10 w-10 text-primary fill-primary" />
                        </div>
                        <h2 className="text-2xl font-black mb-3 text-gray-900">Jelentkezz be!</h2>
                        <p className="text-gray-500 font-medium leading-relaxed">
                            Jelentkezz be, hogy láthasd a kedvenc szolgáltatóidat és egyszerűen foglalhass időpontot.
                        </p>
                        <Button asChild className="mt-6 rounded-full px-6 font-bold">
                            <Link href="/providers">Szalonok felfedezése</Link>
                        </Button>
                    </div>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent-warm flex items-center justify-center shadow-lg shadow-primary/20">
                            <Heart className="h-6 w-6 text-white fill-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Kedvenceim</h1>
                            <p className="text-sm font-medium text-gray-500">Itt találod az elmentett szalonokat</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                        <Sparkles className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-gray-700">{favorites.length} mentett szalon</span>
                    </div>
                </div>

                {favorites.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="h-12 w-12 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-black mb-2 text-gray-900">Még nincs kedvenc szolgáltatód</h2>
                        <p className="text-gray-500 font-medium max-w-sm mx-auto">
                            Fedezd fel a legjobb szalonokat és mentsd el őket a szívecske ikonnal!
                        </p>
                        <Button asChild className="mt-6 rounded-full px-6 font-bold">
                            <Link href="/providers">Szalonok felfedezése</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 pb-10 max-w-5xl">
                        {favorites.map((provider) => (
                            <div key={provider.id} className="h-full">
                                <ProviderCard {...provider} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
