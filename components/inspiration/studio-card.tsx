"use client"

import Link from "next/link"
import { CalendarClock, MapPin, Sparkles, Star, Store } from "lucide-react"

import { SafeImage } from "@/components/ui/safe-image"

export interface StudioCardData {
  id: string
  name: string
  slug: string
  image?: string | null
  profileImage?: string | null
  city?: string | null
  category?: string | null
  rating?: number | null
  reviewCount?: number | null
  allowBookings?: boolean | null
}

interface StudioCardProps {
  studio: StudioCardData
}

export function StudioCard({ studio }: StudioCardProps) {
  const avatarImage = studio.profileImage || studio.image || null
  const initials = studio.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <article className="w-[286px] shrink-0 overflow-hidden rounded-[28px] sm:w-[340px]">
      <Link
        href={`/profile/${studio.slug}`}
        className="search-studio-card group relative block min-h-[330px] overflow-hidden rounded-[28px] bg-surface-muted text-white shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        {studio.image ? (
          <SafeImage
            src={studio.image}
            alt={studio.name}
            fill
            sizes="(max-width: 640px) 286px, 340px"
            className="search-studio-card-image object-cover"
          />
        ) : (
          <div className="flex h-full min-h-[330px] items-center justify-center text-text-secondary">
            <Store className="h-10 w-10 opacity-40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/32 to-black/5" />

        {studio.rating && studio.rating > 0 && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-text-primary shadow-soft">
            <Star className="h-4 w-4 fill-warning text-warning" />
            {studio.rating.toFixed(1)}
          </div>
        )}

        {studio.allowBookings && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-xs font-bold text-accent-primary shadow-soft">
            <CalendarClock className="h-3.5 w-3.5" />
            Időpontkérés elérhető
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
          <div className="flex min-w-0 items-end gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white/80 bg-white/90 shadow-soft">
              {avatarImage ? (
                <SafeImage
                  src={avatarImage}
                  alt={`${studio.name} profilkép`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-accent-primary">
                  {initials || <Store className="h-5 w-5" />}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="line-clamp-2 font-serif text-xl font-semibold leading-tight text-white sm:text-2xl">{studio.name}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-white/90">
                {studio.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-accent-soft" />
                    {studio.city}
                  </span>
                )}
                {studio.category && (
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-accent-soft" />
                    {studio.category}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </Link>
    </article>
  )
}
