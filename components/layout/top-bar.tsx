"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare } from "lucide-react"

import { AuthModal } from "@/components/auth/auth-modal"
import { useAuth } from "@/lib/auth-context"
import { useNotifications } from "@/lib/notification-context"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Inspiráció", match: (pathname: string) => pathname === "/" },
  { href: "/providers", label: "Keresés", match: (pathname: string) => pathname.startsWith("/providers") },
  { href: null, label: "Térkép", match: (pathname: string) => pathname.startsWith("/map") },
  { href: "/dashboard/bookings", label: "Foglalásaim", match: (pathname: string) => pathname.startsWith("/dashboard/bookings") },
]

export function TopBar() {
  const { user, userData } = useAuth()
  const { unreadCount } = useNotifications()
  const pathname = usePathname()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const profileLabel = useMemo(() => {
    if (!user) return "Bejelentkezés"
    return userData?.name?.split(" ")[0] || "Profil"
  }, [user, userData?.name])

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[var(--z-topbar)] border-b border-border-subtle bg-background/92 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 font-serif text-xl font-semibold tracking-wide text-text-primary transition-opacity hover:opacity-80"
          >
            GlowySpot
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Dashboard navigation">
            {navItems.map((item) => {
              const isActive = item.match(pathname)
              const className = cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-surface-elevated text-accent-primary shadow-soft"
                  : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                !item.href && "cursor-not-allowed opacity-60"
              )

              if (!item.href) {
                return (
                  <button key={item.label} type="button" className={className} disabled title="A térképes keresés hamarosan érkezik">
                    {item.label}
                  </button>
                )
              }

              return (
                <Link key={item.href} href={item.href} className={className} aria-current={isActive ? "page" : undefined}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user && (
              <Link
                href="/dashboard/messages"
                className="relative hidden h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-text-primary shadow-soft transition-colors hover:bg-surface-muted sm:flex"
                aria-label="Üzenetek"
              >
                <MessageSquare className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <Link
                href="/dashboard/account"
                className="flex items-center gap-2 rounded-full bg-surface-elevated px-2 py-2 text-sm font-semibold text-text-primary shadow-soft sm:px-3"
                aria-label="Fiókom"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-primary-foreground">
                  {userData?.name?.[0] || "U"}
                </span>
                <span className="hidden sm:inline">{profileLabel}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover sm:inline-flex"
              >
                Bejelentkezés
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}
