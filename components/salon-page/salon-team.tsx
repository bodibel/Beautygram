"use client"

import { SafeImage } from "@/components/ui/safe-image"
import type { SalonPageData } from "@/components/salon-page/types"

interface SalonTeamProps {
  salon: SalonPageData
}

export function SalonTeam({ salon }: SalonTeamProps) {
  const members = salon.teamMembers || []
  if (!salon.isTeam || members.length === 0) return null

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-text-primary">Csapat</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Ismerd meg a szalon szakembereit.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {members.map((member) => (
          <article key={member.id} className="flex gap-4 rounded-[24px] border border-border-subtle bg-surface p-5 shadow-soft">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-muted">
              {member.image ? (
                <SafeImage src={member.image} alt={member.name} fill sizes="80px" className="object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-text-primary">{member.name}</h3>
              {member.role && <p className="mt-1 text-sm font-semibold text-accent-primary">{member.role}</p>}
              {member.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{member.description}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
