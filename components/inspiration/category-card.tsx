"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"

interface CategoryCardProps {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

export function CategoryCard({ label, description, href, icon: Icon }: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-36 w-[156px] shrink-0 flex-col justify-between rounded-[24px] border border-border-subtle bg-surface-elevated p-4 shadow-soft transition-transform hover:-translate-y-0.5 sm:w-[184px]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-base font-bold text-text-primary">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-text-secondary">{description}</span>
      </span>
    </Link>
  )
}
