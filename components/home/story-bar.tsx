"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"
import { useFilter } from "@/lib/filter-context"
import { getFeaturedSalons } from "@/lib/actions/salon"

interface FeaturedSalon {
    id: string
    name: string
    slug: string
    profileImage: string | null
    categories: string[]
    city: string
    rating: number
    subscriptionPlan: string
}

export function StoryBar() {
    const { location, filters } = useFilter()
    const [salons, setSalons] = useState<FeaturedSalon[]>([])
    const [loading, setLoading] = useState(true)
    const [, startTransition] = useTransition()

    useEffect(() => {
        startTransition(() => setLoading(true))
        getFeaturedSalons({
            city: location.city || undefined,
            services: filters.services.length > 0 ? filters.services : undefined,
            limit: 8,
        }).then((data) => {
            setSalons(data as FeaturedSalon[])
            setLoading(false)
        })
    }, [location.city, filters.services])

    const truncateName = (name: string, max = 10) =>
        name.length > max ? name.slice(0, max - 1) + "…" : name

    if (loading) {
        return (
            <div className="w-full overflow-x-auto scrollbar-hide">
                <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[72px] animate-pulse">
                            <div className="h-[72px] w-[72px] rounded-full bg-secondary" />
                            <div className="h-2 w-12 rounded bg-secondary" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (salons.length === 0) return null

    return (
        <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-4">
                {salons.map((salon) => {
                    const isPremium = salon.subscriptionPlan === "premium"
                    return (
                        <Link
                            key={salon.id}
                            href={`/profile/${salon.slug}`}
                            className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group"
                        >
                            {/* Avatar ring */}
                            <div className={`relative h-[72px] w-[72px] rounded-full p-[3px] ${
                                isPremium
                                    ? "bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-400"
                                    : "bg-gradient-to-tr from-accent via-primary to-purple-400"
                            }`}>
                                <div className="relative h-full w-full rounded-full border-2 border-white bg-white overflow-hidden">
                                    {salon.profileImage ? (
                                        <Image
                                            src={salon.profileImage}
                                            alt={salon.name}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-secondary text-primary font-bold text-lg">
                                            {salon.name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Premium crown badge */}
                                {isPremium && (
                                    <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border-2 border-white text-[10px]">
                                        ★
                                    </div>
                                )}

                                {/* Rating badge */}
                                {salon.rating > 0 && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-border">
                                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                        <span className="text-[10px] font-bold text-gray-700">{salon.rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <span className="text-xs font-medium text-foreground truncate w-full text-center group-hover:text-primary transition-colors">
                                {truncateName(salon.name)}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
