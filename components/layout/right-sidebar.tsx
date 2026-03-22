"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { HeroBanner } from "@/components/home/hero-banner"
import { getRecentSalons } from "@/lib/actions/salon"
import { useFilter } from "@/lib/filter-context"

// Tag → service slug mapping (slug-alapú szűrés) vagy szöveges keresés
const TRENDING_TAGS = [
    { label: "#műköröm",   type: "service", value: "nails"   },
    { label: "#balayage",  type: "search",  value: "balayage" },
    { label: "#fodrászat", type: "service", value: "hair"     },
    { label: "#arckezelés",type: "service", value: "skin"     },
    { label: "#smink",     type: "service", value: "makeup"   },
]

export function RightSidebar() {
    const [salons, setSalons] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const { addServiceFilter, updateSearchQuery, clearFilters, filters } = useFilter()

    useEffect(() => {
        getRecentSalons(3).then((data) => {
            setSalons(data)
            setLoading(false)
        })
    }, [])

    const handleTagClick = (tag: typeof TRENDING_TAGS[0]) => {
        clearFilters()
        if (tag.type === "service") {
            addServiceFilter(tag.value)
        } else {
            updateSearchQuery(tag.value)
        }
        router.push("/")
    }

    const isTagActive = (tag: typeof TRENDING_TAGS[0]) =>
        tag.type === "service"
            ? filters.services.includes(tag.value)
            : filters.searchQuery === tag.value

    return (
        <div className="space-y-5">
            {/* Hero Banner */}
            <HeroBanner />

            {/* Recently Joined Salons */}
            <div className="rounded-2xl bg-surface p-5 border border-border shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm">Újonnan csatlakozott szalonok</h3>
                    <Link href="/providers" className="text-xs font-medium text-primary hover:underline">
                        Összes
                    </Link>
                </div>

                <div className="space-y-3">
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="h-10 w-10 rounded-full bg-secondary flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="h-3 w-24 rounded bg-secondary" />
                                    <div className="mt-1 h-2 w-16 rounded bg-muted" />
                                </div>
                            </div>
                        ))
                    ) : salons.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Még nincs szalon.</p>
                    ) : (
                        salons.map((salon) => (
                            <Link
                                key={salon.id}
                                href={`/profile/${salon.slug}`}
                                className="flex items-center gap-3 group hover:bg-primary-subtle rounded-xl px-2 py-1.5 -mx-2 transition-colors"
                            >
                                {/* Avatar */}
                                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 border border-border">
                                    {salon.profileImage ? (
                                        <Image
                                            src={salon.profileImage}
                                            alt={salon.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-primary font-bold text-sm">
                                            {salon.name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                        {salon.name}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {salon.city || salon.categories?.[0] || ""}
                                    </p>
                                </div>

                                {/* Rating */}
                                {salon.rating > 0 && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                        <span className="text-xs font-bold text-foreground">{salon.rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Trending Tags Widget */}
            <div className="rounded-2xl bg-surface p-5 border border-border shadow-sm">
                <h3 className="mb-4 font-semibold text-foreground text-sm">Trending a közeledben</h3>
                <div className="flex flex-wrap gap-2">
                    {TRENDING_TAGS.map((tag) => {
                        const active = isTagActive(tag)
                        return (
                            <button
                                key={tag.label}
                                type="button"
                                onClick={() => handleTagClick(tag)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    active
                                        ? "bg-primary text-white"
                                        : "bg-accent/15 text-accent-dim hover:bg-accent/30"
                                }`}
                            >
                                {tag.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="text-xs text-muted-foreground px-2 flex items-center gap-3 flex-wrap">
                <span className="font-medium">© 2026 GlowySpot</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Adatvédelem</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">ÁSZF</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Rólunk</span>
            </div>
        </div>
    )
}
