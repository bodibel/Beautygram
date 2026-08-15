"use client"

import { Clock, Mail, MapPin, Phone } from "lucide-react"

import type { SalonPageData } from "@/components/salon-page/types"

interface SalonLocationProps {
  salon: SalonPageData
}

const dayLabels: Record<string, string> = {
  monday: "Hétfő",
  tuesday: "Kedd",
  wednesday: "Szerda",
  thursday: "Csütörtök",
  friday: "Péntek",
  saturday: "Szombat",
  sunday: "Vasárnap",
}

export function SalonOpeningHours({ salon }: SalonLocationProps) {
  const hasHours = Boolean(salon.openingHours?.length)

  if (!hasHours) return null

  return (
    <section className="rounded-[28px] border border-border-subtle bg-surface p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 shrink-0 text-accent-primary" />
        <h2 className="font-serif text-3xl font-semibold text-text-primary">Nyitvatartás</h2>
      </div>
      <div className="mt-5 divide-y divide-border-subtle">
        {salon.openingHours?.map((hour) => (
          <div key={hour.day} className="flex items-center justify-between gap-4 py-3 text-sm">
            <span className="font-bold text-text-primary">{dayLabels[hour.day.toLowerCase()] || hour.day}</span>
            <span className="font-semibold text-text-secondary">
              {hour.isOpen ? `${hour.open || ""} - ${hour.close || ""}` : "Zárva"}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SalonLocation({ salon }: SalonLocationProps) {
  const hasContact = Boolean((salon.showPhoneOnProfile && salon.phone) || (salon.showEmailOnProfile && salon.email))
  const hasAddress = Boolean(salon.address || salon.city || salon.district)

  if (!hasContact && !hasAddress) return null

  return (
    <section className="rounded-[28px] border border-border-subtle bg-surface p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <MapPin className="h-6 w-6 shrink-0 text-accent-primary" />
        <h2 className="font-serif text-3xl font-semibold text-text-primary">Helyszín</h2>
      </div>
      {salon.address ? (
        <p className="mt-3 text-sm leading-6 text-text-secondary">{salon.address}</p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-text-secondary">{[salon.city, salon.district].filter(Boolean).join(", ")}</p>
      )}
      {hasContact && (
        <div className="mt-5 grid gap-2 text-sm font-semibold text-text-secondary">
          {salon.showPhoneOnProfile && salon.phone && (
            <a href={`tel:${salon.phone}`} className="inline-flex items-center gap-2 hover:text-accent-primary">
              <Phone className="h-4 w-4" />
              {salon.phone}
            </a>
          )}
          {salon.showEmailOnProfile && salon.email && (
            <a href={`mailto:${salon.email}`} className="inline-flex items-center gap-2 hover:text-accent-primary">
              <Mail className="h-4 w-4" />
              {salon.email}
            </a>
          )}
        </div>
      )}
    </section>
  )
}
