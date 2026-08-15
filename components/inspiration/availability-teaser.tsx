"use client"

import Link from "next/link"
import { CalendarClock, Sparkles } from "lucide-react"

export function AvailabilityTeaser() {
  return (
    <section className="grid gap-4 rounded-[32px] border border-border-subtle bg-surface-elevated p-5 shadow-soft sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
          <CalendarClock className="h-6 w-6" />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-text-primary sm:text-4xl">Last-minute szépség, találgatás nélkül.</h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          A valós idejű időpontkeresés ellenőrzött szalon-elérhetőségre fog épülni. Addig nyiss meg egy szalonprofilt, és kérj időpontot közvetlenül.
        </p>
      </div>

      <div className="flex flex-col justify-between rounded-[24px] bg-surface-muted p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-accent-primary" />
          <div>
            <p className="font-bold text-text-primary">A Booking V1 időpontkérés-alapú</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              A szalonok elfogadhatják vagy elutasíthatják a kéréseket, a vendégek pedig a Foglalásaim oldalon követhetik az állapotot.
            </p>
          </div>
        </div>
        <Link
          href="/providers"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Szalon keresése
        </Link>
      </div>
    </section>
  )
}
