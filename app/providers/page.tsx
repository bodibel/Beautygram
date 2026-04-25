"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { ProviderCard } from "@/components/home/provider-card"
import { getAllSalons } from "@/lib/actions/salon"
import { useFilter } from "@/lib/filter-context"

export default function ProvidersPage() {
    const [providers, setProviders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const { filters } = useFilter()

    useEffect(() => {
        loadProviders()
    }, [])

    const loadProviders = async () => {
        try {
            const salons = await getAllSalons()
            const loadedProviders = salons.map((salon: any) => ({
                id: salon.id,
                name: salon.name,
                category: salon.categories?.[0] || "Egyéb", // Use first category for now
                rating: salon.rating || 0,
                reviewCount: salon.reviewCount || 0,
                location: salon.city, // Changed to show city
                image: salon.coverImage || salon.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
                avatar: salon.profileImage || salon.images?.[0] || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80",
                languages: salon.languages,
                slug: salon.slug || salon.id
            }))

            setProviders(loadedProviders)
        } catch (error) {
            console.error("Error loading salons:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredProviders = useMemo(() => {
        const q = filters.searchQuery.toLowerCase().trim()
        if (!q) return providers
        return providers.filter((p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.location?.toLowerCase().includes(q)
        )
    }, [providers, filters.searchQuery])

    return (
        <MainLayout showRightSidebar={true}>
            <div className="space-y-4 pt-2">
                <h1 className="text-2xl font-bold">Szolgáltatók</h1>

                <div className="grid gap-4 grid-cols-2">
                    {loading ? (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                            Betöltés...
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                            Még nincs egy szalon sem regisztrálva
                        </div>
                    ) : filteredProviders.length === 0 ? (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                            Nincs találat a keresési feltételekre
                        </div>
                    ) : (
                        filteredProviders.map((provider) => (
                            <ProviderCard key={provider.id} {...provider} />
                        ))
                    )}
                </div>
            </div>
        </MainLayout>
    )
}
