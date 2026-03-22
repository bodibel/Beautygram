"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useNotifications } from "@/lib/notification-context"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { AuthModal } from "@/components/auth/auth-modal"
import { cn } from "@/lib/utils"

export function TopBar() {
  const { user, userData } = useAuth()
  const { unreadCount } = useNotifications()
  const pathname = usePathname()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  return (
    <>
      <header
        className="sticky top-0 w-full rounded-none border-b bg-white dark:bg-[#161B22] border-border"
        style={{ zIndex: "var(--z-topbar)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-0">
          {/* Logo — aligned with left sidebar width */}
          <Link
            href="/"
            className="flex-shrink-0 w-[60px] lg:w-[280px] flex items-center justify-center lg:justify-start lg:px-4 text-xl font-light tracking-[0.15em] text-foreground hover:opacity-80 transition-opacity"
          >
            GlowySpot
          </Link>

          {/* Main nav — Bejegyzések + Szolgáltatók */}
          <nav className="hidden md:flex items-center gap-2 ml-2">
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
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2 pr-6">
            {user && (
              <>
                <Link
                  href="/dashboard/messages"
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-primary-subtle transition-colors"
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
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-warm text-sm font-bold text-white ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
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
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                Bejelentkezés
              </button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}
