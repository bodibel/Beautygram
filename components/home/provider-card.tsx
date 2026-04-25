"use client"

import { useState } from "react"
import Image from "next/image"
import { Star, MapPin, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { FavoriteButton } from "@/components/salon/FavoriteButton"
import { normalizeImageSrc } from "@/lib/image-utils"

interface ProviderCardProps {
    id: string
    slug: string
    name: string
    category: string
    rating: number
    reviewCount: number
    location: string
    image: string
    avatar: string
    languages?: string[]
}

export function ProviderCard({ id, slug, name, category, rating, reviewCount, location, image, avatar, languages }: ProviderCardProps) {
    const [hovered, setHovered] = useState(false)
    const normalizedImage = normalizeImageSrc(image) || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80"
    const normalizedAvatar = normalizeImageSrc(avatar) || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=100&q=80"

    return (
        <Link href={`/profile/${slug}`} className="block h-full">
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    height: "100%",
                    borderRadius: "24px",
                    overflow: "hidden",
                    transform: hovered ? "translateY(-4px)" : "translateY(0px)",
                    boxShadow: hovered
                        ? "0 20px 40px rgba(0,0,0,0.16)"
                        : "0 2px 8px rgba(0,0,0,0.08)",
                    transition: "transform 0.4s ease, box-shadow 0.4s ease",
                }}
            >
                <Card className="overflow-hidden border-none h-full flex flex-col bg-white rounded-3xl shadow-none" style={{ borderRadius: "24px" }}>

                    {/* Image */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                        <Image
                            src={normalizedImage}
                            alt={name}
                            fill
                            className="object-cover"
                            style={{
                                transform: hovered ? "scale(1.06)" : "scale(1)",
                                transition: "transform 0.4s ease",
                            }}
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority={false}
                        />
                        <div className="absolute top-3 right-3 z-10">
                            <FavoriteButton
                                salonId={id}
                                className="bg-white shadow-sm h-9 w-9 hover:bg-white hover:shadow-md hover:scale-110 transition-all duration-300"
                                size="icon"
                            />
                        </div>
                    </div>

                    <CardContent className="p-5 flex-1 flex flex-col gap-3">
                        {/* Avatar + Rating */}
                        <div className="flex justify-between items-start gap-3">
                            <div className="relative -mt-14 mb-1">
                                <div className="relative h-20 w-20 rounded-full border-4 border-white shadow-sm overflow-hidden bg-white">
                                    <Image src={normalizedAvatar} alt={name} fill className="object-cover" sizes="64px" />
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 mt-1">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-bold text-gray-900">{rating.toFixed(1)}</span>
                                <span className="text-xs text-gray-500">({reviewCount})</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                            <div>
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-white bg-accent px-2 py-0.5 rounded-md mb-1.5">
                                    {category}
                                </span>
                                <h3
                                    className="font-bold text-lg leading-tight line-clamp-1"
                                    style={{
                                        color: hovered ? "var(--color-primary)" : "#111827",
                                        transition: "color 0.4s ease",
                                    }}
                                >
                                    {name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                                <span className="truncate">{location}</span>
                            </div>
                        </div>

                        {/* Languages */}
                        {languages && languages.length > 0 && (
                            <div className="pt-3 border-t border-gray-50 flex items-center gap-2 overflow-hidden">
                                <Globe className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    {languages.slice(0, 2).map((lang) => (
                                        <span key={lang} className="text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                            {lang}
                                        </span>
                                    ))}
                                    {languages.length > 2 && (
                                        <span className="text-xs text-gray-400 pl-0.5">+{languages.length - 2}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Link>
    )
}
