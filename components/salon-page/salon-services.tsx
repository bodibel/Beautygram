"use client"

import { CalendarClock } from "lucide-react"

import type { SalonPageData, SalonPageService } from "@/components/salon-page/types"

interface SalonServicesProps {
  salon: SalonPageData
  onBook: (service?: SalonPageService) => void
}

export function SalonServices({ salon, onBook }: SalonServicesProps) {
  const services = salon.services || []

  if (services.length === 0) return null

  return (
    <section className="space-y-5" id="services">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-text-primary">Szolgáltatások</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {salon.allowBookings
              ? "Válassz szolgáltatást, majd küldj időpontkérést a szalonnak."
              : "Böngészd a szolgáltatásokat. Ez a szalon jelenleg nem fogad online időpontkérést."}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {services.map((service) => (
          <article key={service.id} className="rounded-[24px] border border-border-subtle bg-surface p-5 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-text-primary">{service.name}</h3>
                {service.description && <p className="mt-2 text-sm leading-6 text-text-secondary">{service.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-text-secondary">
                  {service.duration && <span>{service.duration}</span>}
                  {service.price && (
                    <span className="text-text-primary">
                      {service.price} {salon.currency || ""}
                    </span>
                  )}
                </div>
              </div>

              {salon.allowBookings && (
                <button
                  type="button"
                  data-testid={`book-service-${service.id}`}
                  onClick={() => onBook(service)}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-accent-soft px-5 text-sm font-bold text-accent-primary transition-colors hover:bg-accent-primary hover:text-primary-foreground"
                >
                  <CalendarClock className="h-4 w-4" />
                  Időpontkérés
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
