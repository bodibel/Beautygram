"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { getDashboardSalonLinks, isNavActive } from "@/lib/navigation-config"
import { cn } from "@/lib/utils"

export function SalonConsoleNav({ salonId }: { salonId: string }) {
  const pathname = usePathname()
  const links = getDashboardSalonLinks(salonId)

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-border-subtle pb-3">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = isNavActive(pathname, link)

        return (
          <Link
            key={link.href}
            href={link.href!}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold transition-colors",
              isActive
                ? "border-accent-primary bg-accent-soft text-accent-primary"
                : "border-border-subtle bg-surface text-text-secondary hover:text-text-primary"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
