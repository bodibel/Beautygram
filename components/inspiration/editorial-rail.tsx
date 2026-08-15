"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface EditorialRailProps {
  title: string
  description?: string
  href?: string
  actionLabel?: string
  children: ReactNode
}

export function EditorialRail({ title, description, href, actionLabel = "Felfedezés", children }: EditorialRailProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="hidden shrink-0 items-center gap-2 rounded-full border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-text-primary shadow-soft transition-colors hover:text-accent-primary sm:flex"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex w-max max-w-none gap-4 lg:w-full">{children}</div>
      </div>
    </section>
  )
}
