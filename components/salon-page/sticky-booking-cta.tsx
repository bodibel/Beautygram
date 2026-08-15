"use client"

import { CalendarClock } from "lucide-react"

import type { SalonPageData, SalonPageService } from "@/components/salon-page/types"

interface StickyBookingCtaProps {
  salon: SalonPageData
  onBook: (service?: SalonPageService) => void
}

export function StickyBookingCta({ salon, onBook }: StickyBookingCtaProps) {
  if (!salon.allowBookings) return null

  return (
    <div className="fixed inset-x-0 bottom-[72px] z-[45] px-4 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-border-subtle bg-surface/95 p-2 pl-5 shadow-[0_16px_60px_rgba(48,36,30,0.18)] backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">{salon.name}</p>
          <p className="text-xs font-semibold text-text-secondary">Időpontkérés</p>
        </div>
        <button
          type="button"
          onClick={() => onBook()}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-accent-primary px-4 text-sm font-bold text-primary-foreground"
        >
          <CalendarClock className="h-4 w-4" />
          Kérem
        </button>
      </div>
    </div>
  )
}
