"use client"

import Link from "next/link"
import { CalendarDays, MapPin, Search, Sparkles } from "lucide-react"

export function FloatingSearchBar() {
  return (
    <Link
      href="/providers"
      className="group flex w-full flex-col gap-3 rounded-[28px] border border-border-subtle bg-surface-elevated p-3 shadow-editorial transition-transform active:scale-[0.99] sm:flex-row sm:items-center sm:rounded-full sm:p-2"
      aria-label="Szépségszolgáltatások és szalonok keresése"
    >
      <div className="flex min-h-[48px] flex-1 items-center gap-3 rounded-2xl bg-surface-muted px-4 sm:rounded-full">
        <Search className="h-5 w-5 shrink-0 text-accent-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">Mit keresel?</p>
          <p className="truncate text-xs text-text-secondary">Köröm, haj, arckezelés...</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <div className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-surface px-3 text-text-secondary sm:rounded-full">
          <MapPin className="h-4 w-4 shrink-0 text-accent-primary" />
          <span className="truncate text-xs font-semibold">A közeledben</span>
        </div>
        <div className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-surface px-3 text-text-secondary sm:rounded-full">
          <CalendarDays className="h-4 w-4 shrink-0 text-accent-primary" />
          <span className="truncate text-xs font-semibold">Bármikor</span>
        </div>
      </div>

      <div className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-accent-primary px-5 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary-hover sm:rounded-full">
        <Sparkles className="h-4 w-4" />
        Felfedezés
      </div>
    </Link>
  )
}
