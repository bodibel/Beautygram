"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, SlidersHorizontal } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useNotifications } from "@/lib/notification-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { cn } from "@/lib/utils"
import { useFilter } from "@/lib/filter-context"

export function TopBar() {
  const { user, userData } = useAuth()
  const { unreadCount } = useNotifications()
  const { toggleFilterModal } = useFilter()
  const pathname = usePathname()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const showFilterTrigger = pathname === "/" || pathname?.startsWith("/providers")

  return (
    <>
      <header
        className="sticky top-0 w-full rounded-none border-b border-border bg-white"
        style={{ zIndex: "var(--z-topbar)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:px-4 lg:gap-4 lg:px-0">
          {/* Logo — aligned with left sidebar width */}
          <Link
            href="/"
            className="min-w-0 flex-1 truncate pr-2 text-base font-light tracking-[0.08em] text-foreground transition-opacity hover:opacity-80 sm:text-lg lg:w-[280px] lg:flex-none lg:justify-start lg:px-4 lg:text-xl lg:tracking-[0.15em]"
          >
            GlowySpot
          </Link>

          {/* Main nav — Bejegyzések + Szolgáltatók */}
          <nav className="hidden items-center gap-2 md:flex lg:ml-6">
            <Link
              href="/"
              className={cn(
                "px-5 py-2 text-sm font-semibold rounded-xl transition-colors",
                pathname === "/"
                  ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                  : "border border-primary/40 text-primary hover:bg-primary-subtle"
              )}
            >
              Bejegyzések
            </Link>
            <Link
              href="/providers"
              className={cn(
                "px-5 py-2 text-sm font-semibold rounded-xl transition-colors",
                pathname?.startsWith("/providers")
                  ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                  : "border border-primary/40 text-primary hover:bg-primary-subtle"
              )}
            >
              Szolgáltatók
            </Link>
          </nav>

          {/* Spacer */}
          <div className="hidden md:block flex-1" />

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:pr-6">
            {showFilterTrigger && (
              <button
                type="button"
                onClick={() => toggleFilterModal(true)}
                className="flex h-9 items-center gap-2 rounded-xl border border-primary/20 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary-subtle lg:hidden"
                aria-label="Keresés és szűrés"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Szűrés</span>
              </button>
            )}

            {user && (
              <>
                <Link
                  href="/dashboard/messages"
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-primary-subtle"
                  aria-label="Üzenetek"
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/profile/me"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-warm text-sm font-bold text-white ring-2 ring-primary/20 transition-all hover:ring-primary/40"
                  aria-label="Profilom"
                >
                  {userData?.name?.[0] || "U"}
                </Link>
              </>
            )}

            {!user && (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover sm:px-4"
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
