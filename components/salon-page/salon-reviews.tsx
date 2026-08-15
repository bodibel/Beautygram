"use client"

import Image from "next/image"
import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SalonPageData } from "@/components/salon-page/types"

interface SalonReviewsProps {
  salon: SalonPageData
  isOwner: boolean
  onReview: () => void
}

export function SalonReviews({ salon, isOwner, onReview }: SalonReviewsProps) {
  const reviews = salon.reviews || []
  const hasRating = Boolean(salon.rating && salon.rating > 0 && salon.reviewCount && salon.reviewCount > 0)

  return (
    <section className="rounded-[28px] border border-border-subtle bg-surface p-6 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-text-primary">Vélemények</h2>
          {hasRating && (
            <p className="mt-2 text-sm font-semibold text-text-secondary">
              {salon.rating?.toFixed(1)} / 5 · {salon.reviewCount} vélemény
            </p>
          )}
        </div>
        {!isOwner && (
          <Button type="button" variant="outline" onClick={onReview} className="min-h-[44px] rounded-full">
            Vélemény írása
          </Button>
        )}
      </div>

      {reviews.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {reviews.slice(0, 6).map((review) => (
            <article key={review.id} className="rounded-[24px] border border-border-subtle bg-surface p-5 shadow-soft">
              <div className="flex gap-4">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-surface-muted">
                  <Image
                    src={review.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name || "Vendég")}&background=f3e1d7&color=7f4d3b`}
                    alt={review.user?.name || "Vendég"}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-text-primary">{review.user?.name || "Vendég"}</h3>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn("h-3.5 w-3.5", review.rating >= star ? "fill-warning text-warning" : "text-border-subtle")}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{review.comment}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-dashed border-border-subtle bg-background/40 p-8 text-center">
          <Star className="mx-auto h-8 w-8 text-accent-primary opacity-60" />
          <h3 className="mt-4 text-lg font-bold text-text-primary">Még nincs vélemény</h3>
          <p className="mt-2 text-sm text-text-secondary">A szalon első értékelései itt fognak megjelenni.</p>
        </div>
      )}
    </section>
  )
}
