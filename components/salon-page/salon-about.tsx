"use client"

import { SafeImage } from "@/components/ui/safe-image"
import type { SalonPageData } from "@/components/salon-page/types"

interface SalonAboutProps {
  salon: SalonPageData
  image?: string | null
}

export function SalonAbout({ salon, image }: SalonAboutProps) {
  const description = salon.aboutMe || ""
  if (!description && !image) return null

  return (
    <section className="grid gap-5 rounded-[32px] border border-border-subtle bg-surface p-5 shadow-soft md:p-7">
      {image && (
        <div className="relative min-h-[280px] overflow-hidden rounded-[24px] bg-surface-muted">
          <SafeImage src={image} alt={salon.name} fill sizes="(max-width: 768px) 100vw, 45vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-col justify-center p-1">
        <h2 className="font-serif text-3xl font-semibold text-text-primary">A szalonról</h2>
        {description ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-text-secondary">{description}</p>
        ) : (
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            A szalon vizuális portfóliója és szolgáltatásai alapján tudsz tájékozódni.
          </p>
        )}
      </div>
    </section>
  )
}
