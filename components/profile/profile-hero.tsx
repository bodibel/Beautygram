"use client"

import Image from "next/image"
import { MapPin, MessageCircle, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/salon/FavoriteButton"

// Category slug to label mapping
const CATEGORY_LABELS: Record<string, string> = {
    nails: "Műköröm",
    hair: "Fodrászat",
    skin: "Kozmetika",
    pedi: "Pedikűr",
    makeup: "Smink",
    lashes: "Szempilla",
    brows: "Szemöldök",
    massage: "Masszázs",
    wax: "Gyantázás",
    other: "Egyéb",
}

interface ProfileHeroProps {
    provider: {
        name: string
        categories: string[]
        city?: string
        district?: string
        address?: string
        coverImage: string
        avatar: string
        profileImage?: string
        rating: number
        reviewCount: number
        id: string
    }
    isOwner?: boolean
    onMessageClick: () => void
}

export function ProfileHero({ provider, onMessageClick, isOwner }: ProfileHeroProps) {
    return (
        <div className="relative w-full mb-0">
            {/* Cover Image Container */}
            <div className="container mx-auto px-4 pt-4">
                <div className="relative h-64 md:h-80 w-full overflow-hidden rounded-2xl shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                    <Image
                        src={provider.coverImage}
                        alt="Cover"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            </div>

            {/* Content Container */}
            <div className="container mx-auto px-4">
                <div className="relative flex flex-col items-start lg:flex-row lg:items-end lg:gap-5 -mt-12 lg:-mt-16 pb-8">
                    {/* Avatar - Circular Refinement */}
                    <div className="relative shrink-0 z-20 ml-5">
                        <div className="relative h-32 w-32 lg:h-48 lg:w-48 rounded-full border-[5px] border-white bg-white shadow-none overflow-hidden aspect-square">
                            <Image
                                src={provider.avatar || provider.profileImage || "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400"}
                                alt={provider.name}
                                fill
                                className="object-cover rounded-full"
                            />
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 flex flex-col gap-2 lg:pb-3 w-full">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            <div className="pt-4 lg:pt-[70px] space-y-3">
                                <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">{provider.name}</h1>

                                <div className="flex flex-wrap gap-2">
                                    {provider.categories?.map((cat, idx) => (
                                        <span key={idx} className="px-4 py-1.5 rounded-full bg-accent text-white text-[11px] font-black uppercase tracking-widest">
                                            {CATEGORY_LABELS[cat.toLowerCase()] || cat}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-5 text-sm text-gray-500 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span>
                                            {provider.city}
                                            {provider.district ? `, ${provider.district}` : ""}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        <span className="text-gray-900 font-bold">{provider.rating?.toFixed(1) || "0.0"}</span>
                                        <span className="text-gray-400">({provider.reviewCount || 0} értékelés)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {!isOwner && (
                                <div className="flex items-center gap-3 mt-8 lg:mt-[84px] lg:mb-1">
                                    <Button
                                        className="rounded-xl bg-gray-300 text-gray-500 px-8 py-6 text-base font-bold cursor-not-allowed"
                                        disabled
                                        title="Hamarosan elérhető!"
                                    >
                                        Időpontfoglalás
                                    </Button>
                                    <Button variant="outline" className="rounded-xl gap-2 border-gray-200 hover:bg-gray-50 px-6 py-6 font-bold text-gray-700" onClick={onMessageClick}>
                                        <MessageCircle className="h-5 w-5" />
                                        Üzenet
                                    </Button>
                                    <FavoriteButton
                                        salonId={provider.id}
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-xl h-12 w-12"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
