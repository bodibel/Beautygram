"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

import {
  getDashboardBottomLinks,
  getDashboardSalonBottomLinks,
  getSalonBottomLinks,
  isNavActive,
} from "@/lib/navigation-config"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()
  const params = useParams()
  const legacySalonId = typeof params.id === "string" ? params.id : undefined
  const dashboardSalonId = typeof params.salonId === "string" ? params.salonId : undefined
  const isLegacySalonContext = pathname.startsWith("/salon/") && legacySalonId
  const isDashboardSalonContext = pathname.startsWith("/dashboard/salons/") && dashboardSalonId

  const navItems = isDashboardSalonContext
    ? getDashboardSalonBottomLinks(dashboardSalonId)
    : isLegacySalonContext
      ? getSalonBottomLinks(legacySalonId)
      : getDashboardBottomLinks()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 flex min-h-16 items-center justify-around border-t border-border-subtle bg-surface/95 px-2 pt-2 shadow-[0_-12px_40px_rgba(48,36,30,0.08)] backdrop-blur md:hidden"
      style={{
        zIndex: "var(--z-bottom-nav)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = isNavActive(pathname, item)

        return (
          <Link
            key={item.href}
            href={item.href!}
            className={cn(
              "flex min-h-11 min-w-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-center transition-colors",
              isActive ? "text-accent-primary" : "text-text-secondary"
            )}
            aria-label={item.label}
          >
            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
            <span className="text-[10px] font-bold leading-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
