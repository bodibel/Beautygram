"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AuthModal } from "@/components/auth/auth-modal"
import { PublicBottomNav } from "@/components/navigation/public-bottom-nav"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface PublicDiscoveryLayoutProps {
  children: React.ReactNode
  flushTop?: boolean
}

const desktopNavItems = [
  { href: "/", label: "Inspiráció", match: (pathname: string) => pathname === "/" },
  { href: "/providers", label: "Keresés", match: (pathname: string) => pathname.startsWith("/providers") },
  { href: null, label: "Térkép", match: (pathname: string) => pathname.startsWith("/map") },
  { href: "/dashboard/bookings", label: "Foglalásaim", match: (pathname: string) => pathname.startsWith("/dashboard/bookings") },
]

export function PublicDiscoveryLayout({ children, flushTop = false }: PublicDiscoveryLayoutProps) {
  const pathname = usePathname()
  const { user, userData } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const profileLabel = useMemo(() => {
    if (!user) return "Bejelentkezés"
    return userData?.name?.split(" ")[0] || "Profil"
  }, [user, userData?.name])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-text-primary">
      <header
        className="fixed inset-x-0 top-0 z-[var(--z-topbar)] border-b border-border-subtle bg-background/92 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 font-serif text-xl font-semibold tracking-wide text-text-primary transition-opacity hover:opacity-80"
          >
            GlowySpot
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Public desktop navigation">
            {desktopNavItems.map((item) => {
              const isActive = item.match(pathname)
              const className = cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                isActive ? "bg-surface-elevated text-accent-primary shadow-soft" : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
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
            {user ? (
              <Link
                href="/dashboard/account"
                className="hidden items-center gap-2 rounded-full bg-surface-elevated px-3 py-2 text-sm font-semibold text-text-primary shadow-soft sm:flex"
                aria-label="Profil"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-primary-foreground">
                  {userData?.name?.[0] || "U"}
                </span>
                <span>{profileLabel}</span>
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

      <main
        className={cn(
          "mx-auto min-h-[calc(100vh-4rem)] w-full max-w-7xl px-4 pb-28 sm:px-6 md:pb-10 lg:px-8",
        )}
        style={{
          paddingTop: flushTop ? "calc(4rem + env(safe-area-inset-top))" : "calc(5rem + env(safe-area-inset-top))",
        }}
      >
        {children}
      </main>

      <PublicBottomNav />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  )
}
