"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { CalendarClock, Home, Map, Search, User } from "lucide-react"

import { AuthModal } from "@/components/auth/auth-modal"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const publicNavItems = [
  { href: "/", label: "Inspiráció", icon: Home, requiresAuth: false, match: (pathname: string) => pathname === "/" },
  { href: "/providers", label: "Keresés", icon: Search, requiresAuth: false, match: (pathname: string) => pathname.startsWith("/providers") },
  { href: null, label: "Térkép", icon: Map, requiresAuth: false, match: (pathname: string) => pathname.startsWith("/map") },
  { href: "/dashboard/bookings", label: "Foglalásaim", icon: CalendarClock, requiresAuth: true, match: (pathname: string) => pathname.startsWith("/dashboard/bookings") },
  { href: "/dashboard/account", label: "Profil", icon: User, requiresAuth: true, match: (pathname: string) => pathname.startsWith("/dashboard/account") || pathname.startsWith("/profile/me") },
]

export function PublicBottomNav() {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-[var(--z-bottom-nav)] border-t border-border-subtle bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_40px_rgba(48,36,30,0.08)] backdrop-blur md:hidden"
        aria-label="Public navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {publicNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.match(pathname)
            // A védett menüpontok kijelentkezve bejelentkezési ablakot nyitnak,
            // ahelyett hogy egy guard-redirectbe futnának.
            const needsLogin = item.requiresAuth && !loading && !user
            const className = cn(
              "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[10px] font-semibold transition-colors",
              isActive ? "text-accent-primary" : "text-text-secondary",
              !item.href && "opacity-60"
            )

            const content = (
              <>
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span>{item.label}</span>
              </>
            )

            if (!item.href) {
              return (
                <button
                  key={item.label}
                  type="button"
                  className={className}
                  aria-label={`${item.label} hamarosan érkezik`}
                  title="A térképes keresés hamarosan érkezik"
                  disabled
                >
                  {content}
                </button>
              )
            }

            if (needsLogin) {
              return (
                <button
                  key={item.href}
                  type="button"
                  className={className}
                  aria-label={`${item.label} – bejelentkezés szükséges`}
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  {content}
                </button>
              )
            }

            return (
              <Link key={item.href} href={item.href} className={className} aria-current={isActive ? "page" : undefined}>
                {content}
              </Link>
            )
          })}
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}
