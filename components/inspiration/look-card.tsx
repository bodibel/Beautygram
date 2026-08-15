"use client"

import Link from "next/link"
import { Heart, ImageIcon, MessageCircle, Share2, Star } from "lucide-react"

import { SafeImage } from "@/components/ui/safe-image"

export interface LookCardData {
  id: string
  image?: string | null
  title: string
  salonName: string
  salonSlug: string
  category?: string | null
  rating?: number | null
  likes?: number
  comments?: number
}

interface LookCardProps {
  look: LookCardData
}

export function LookCard({ look }: LookCardProps) {
  return (
    <article className="w-[286px] shrink-0 overflow-hidden rounded-[28px] sm:w-[340px]">
      <Link
        href={`/profile/${look.salonSlug}`}
        className="salon-work-card group relative block min-h-[420px] overflow-hidden rounded-[28px] bg-surface-muted text-white shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        {look.image ? (
          <SafeImage
            src={look.image}
            alt={look.title}
            fill
            sizes="(max-width: 640px) 286px, 340px"
            className="salon-work-card-image object-cover"
          />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center text-text-secondary">
            <ImageIcon className="h-10 w-10 opacity-40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/36 to-black/5" />

        {look.rating && look.rating > 0 && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-text-primary shadow-soft">
            <Star className="h-4 w-4 fill-warning text-warning" />
            {look.rating.toFixed(1)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 space-y-4 p-5">
          <div className="space-y-2">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-xs font-bold text-white/88 backdrop-blur">
              <span className="truncate">{look.salonName}</span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-white/45" />
              <span className="shrink-0 text-white/72">{look.category || "Portfólió"}</span>
            </div>

            <p className="line-clamp-2 text-sm font-semibold leading-5 text-white/95">{look.title}</p>
            <span className="inline-flex text-xs font-bold uppercase tracking-wide text-white/70 group-hover:text-white">
              Több
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-white/16 pt-3">
            <div className="flex items-center gap-3 text-sm font-bold text-white/92">
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-5 w-5" />
                {look.likes || 0}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-5 w-5" />
                {look.comments || 0}
              </span>
            </div>
            <Share2 className="h-5 w-5 text-white/88" />
          </div>
        </div>
      </Link>
    </article>
  )
}
