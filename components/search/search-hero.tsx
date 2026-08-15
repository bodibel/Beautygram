import { CalendarClock, ShieldCheck, Sparkles } from "lucide-react"

import { SafeImage } from "@/components/ui/safe-image"

interface SearchHeroProps {
  studioCount: number
}

export function SearchHero({ studioCount }: SearchHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-border-subtle bg-surface-elevated p-4 shadow-soft sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-stretch">
        <div className="relative space-y-5 px-1 py-2 sm:space-y-6 sm:px-2 lg:py-5">
          <div className="space-y-3">
            <h1 className="font-serif text-3xl font-semibold leading-[1.04] text-text-primary sm:text-5xl lg:text-6xl">
              Találd meg a hozzád illő szépségszalont.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
              Böngéssz szolgáltatás, város és valós szalonprofilok alapján. Az alábbi kereső és szűrők segítenek gyorsan szűkíteni a találatokat.
            </p>
          </div>

          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-border-subtle bg-background p-4 shadow-soft">
              <Sparkles className="h-5 w-5 text-accent-primary" />
              <p className="mt-3 text-lg font-bold text-text-primary">{studioCount}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">Aktív szalon</p>
            </div>
            <div className="rounded-[24px] border border-border-subtle bg-background p-4 shadow-soft">
              <ShieldCheck className="h-5 w-5 text-accent-primary" />
              <p className="mt-3 text-sm font-bold text-text-primary">Valós profiladatok</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Név, város, kategória és értékelés, ha elérhető.</p>
            </div>
            <div className="rounded-[24px] border border-border-subtle bg-background p-4 shadow-soft">
              <CalendarClock className="h-5 w-5 text-accent-primary" />
              <p className="mt-3 text-sm font-bold text-text-primary">Időpontkérés</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">A foglalás kérésalapú, hamis szabad időpontok nélkül.</p>
            </div>
          </div>

          <a
            href="#search-results"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent-primary px-5 text-sm font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
          >
            Ugrás a találatokhoz
          </a>
        </div>

        <div className="relative min-h-[220px] overflow-hidden rounded-[28px] bg-surface-muted sm:min-h-[300px] lg:min-h-full">
          <SafeImage
            src="/images/hero/search-hero-beauty.png"
            alt="Elegáns szépségszalon hangulat"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 520px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(48,36,30,0.16)] via-transparent to-transparent" />
        </div>
      </div>
    </section>
  )
}
