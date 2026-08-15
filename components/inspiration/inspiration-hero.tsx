"use client"

import { FloatingSearchBar } from "@/components/inspiration/floating-search-bar"
import { SafeImage } from "@/components/ui/safe-image"

interface InspirationHeroProps {
  image?: string | null
}

export function InspirationHero({ image }: InspirationHeroProps) {
  return (
    <section className="relative left-1/2 min-h-[76svh] w-screen -translate-x-1/2 overflow-hidden bg-surface-muted sm:min-h-[720px]">
      {image ? (
        <SafeImage
          src={image}
          alt="Prémium szépségszalon inspiráció"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--color-accent-soft),transparent_35%),linear-gradient(135deg,var(--color-surface-elevated),var(--color-surface-muted))]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-background/96 via-background/58 to-background/12" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/78 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[76svh] w-full max-w-7xl flex-col justify-end gap-10 px-4 pb-10 pt-20 sm:min-h-[720px] sm:px-6 sm:pb-16 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-serif text-5xl font-semibold leading-[0.95] tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            Találd meg a stílust. Foglalj magabiztosan.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary sm:text-lg">
            Fedezz fel prémium szépségmunkákat, megbízható helyi szalonokat és olyan időpontot, ami tényleg passzol hozzád.
          </p>
        </div>

        <div className="max-w-3xl">
          <FloatingSearchBar />
        </div>
      </div>
    </section>
  )
}
