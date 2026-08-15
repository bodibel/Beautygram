"use client"

import { CalendarCheck, MapPin, Star } from "lucide-react"

import type { SalonPageData } from "@/components/salon-page/types"

interface SalonTrustStripProps {
  salon: SalonPageData
}

export function SalonTrustStrip({ salon }: SalonTrustStripProps) {
  const location = [salon.city, salon.district].filter(Boolean).join(", ")
  const hasRating = Boolean(salon.rating && salon.rating > 0 && salon.reviewCount && salon.reviewCount > 0)

  return (
    <section className="grid max-w-[760px] gap-3 md:grid-cols-3 lg:max-w-[740px] xl:max-w-[760px]">
      {location && <TrustItem icon={MapPin} title="Helyszín" value={location} />}
      {salon.allowBookings && <TrustItem icon={CalendarCheck} title="Időpontkérés" value="Kérésalapú foglalási folyamat" />}
      {hasRating && <TrustItem icon={Star} title="Vélemények" value={`${salon.rating?.toFixed(1)} / 5 · ${salon.reviewCount} értékelés`} />}
    </section>
  )
}

function TrustItem({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ElementType
  title: string
  value: string
}) {
  return (
    <div className="rounded-[24px] border border-border-subtle bg-surface p-5 shadow-soft">
      <Icon className="h-5 w-5 text-accent-primary" />
      <p className="mt-4 text-sm font-bold text-text-primary">{title}</p>
      <p className="mt-1 text-sm leading-5 text-text-secondary">{value}</p>
    </div>
  )
}
