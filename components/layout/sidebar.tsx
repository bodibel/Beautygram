"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useParams, useRouter } from "next/navigation"
import { LogOut, ArrowLeft, Star, MapPin, MessageCircle, Settings, Store } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth/auth-modal"
import { FilterModal } from "@/components/layout/filter-modal"
import { FilterPanel } from "@/components/layout/filter-panel"
import { getNavLinks, isNavActive } from "@/lib/navigation-config"
import { useAuth } from "@/lib/auth-context"
import { useFilter } from "@/lib/filter-context"
import { useNotifications } from "@/lib/notification-context"
import { useSalonProfile } from "@/lib/salon-profile-context"
import { FavoriteButton } from "@/components/salon/FavoriteButton"
import { signOut } from "next-auth/react"

const CATEGORY_LABELS: Record<string, string> = {
  nails: "Műköröm",
  hair: "Fodrászat",
  skin: "Kozmetika",
  pedi: "Pedikűr",
  makeup: "Smink",
  lashes: "Szempilla",
  brows: "Szemöldök",
  massage: "Masszázs",
  wax: "Gyantázás",
  other: "Egyéb",
}

export function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const { isFilterModalOpen, toggleFilterModal, clearFilters } = useFilter()
  const { unreadCount } = useNotifications()
  const salonProfileCtx = useSalonProfile()
  const salonProfile = salonProfileCtx?.salonProfile

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const legacySalonId = typeof params.id === "string" ? params.id : undefined
  const dashboardSalonId = typeof params.salonId === "string" ? params.salonId : undefined
  const isLegacySalonContext = !!(pathname.startsWith("/salon/") && legacySalonId)
  const isDashboardSalonContext = !!(pathname.startsWith("/dashboard/salons/") && dashboardSalonId)
  const isSalonContext = isLegacySalonContext || isDashboardSalonContext
  const salonId = isDashboardSalonContext ? dashboardSalonId : legacySalonId
  const isOnDashboard = pathname?.startsWith("/dashboard")
  const isOnProfilePage = pathname?.startsWith("/profile/")

  // Nav links per context
  const navLinks = isSalonContext || isOnDashboard || userData
    ? getNavLinks(userData?.role, isSalonContext, salonId, !!userData, undefined, isDashboardSalonContext)
    : null

  const showNavLinks = !!(navLinks && (isSalonContext || isOnDashboard))
  const showProfilePanel = isOnProfilePage && !!salonProfile
  const showFilterPanel = !isOnDashboard && !showNavLinks && !showProfilePanel
  const showDashboardSidebar = !!(!authLoading && isOnDashboard && !isSalonContext && userData && navLinks)
  const showDashboardCta = !!(
    showDashboardSidebar &&
    userData?.role !== "admin" &&
    !pathname.startsWith("/dashboard/provider") &&
    !pathname.startsWith("/dashboard/salons")
  )

  const isOwner = userData?.id === salonProfile?.ownerId
  const displayName = userData?.name ?? "Felhasználó"
  const displayInitial = displayName[0]?.toUpperCase() ?? "U"

  const isLinkActive = (href?: string) => {
    if (!href) return false
    return isNavActive(pathname, navLinks?.find((link) => link.href === href) ?? { href })
  }

  return (
    <>
      {isLegacySalonContext && showNavLinks && navLinks && (
        <nav className="sticky top-14 z-30 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          {navLinks.map((link, index) => {
            const Icon = link.icon
            const isActive = isLinkActive(link.href)
            const content = (
              <>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap text-xs font-semibold">{link.label}</span>
                {link.badge === "unread-messages" && unreadCount > 0 && (
                  <Badge className="ml-1 h-5 min-w-[20px] rounded-full border-none bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </>
            )
            const className = cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground"
            )

            if (link.onClick) {
              return (
                <button key={index} type="button" onClick={link.onClick} className={className}>
                  {content}
                </button>
              )
            }

            return (
              <Link key={link.href} href={link.href!} className={className}>
                {content}
              </Link>
            )
          })}
        </nav>
      )}

      <aside
        className="fixed top-[5.5rem] bottom-0 hidden h-[calc(100vh-5.5rem)] w-[300px] flex-shrink-0 flex-col gap-3 overflow-hidden self-start lg:left-[max(2rem,calc((100vw-1440px)/2+2rem))] lg:flex"
        style={{ zIndex: "var(--z-sidebar)" }}
      >
        {showDashboardSidebar && navLinks && (
          <div className="flex h-full min-h-0 flex-col rounded-3xl border border-orange-100/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(69,44,28,0.08)] backdrop-blur">
            <div className="flex items-center gap-3 border-b border-orange-100/80 pb-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xl font-black text-white shadow-sm">
                {displayInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black text-text-primary">{displayName}</p>
                <p className="truncate text-sm text-text-secondary">{userData.email}</p>
              </div>
            </div>

            <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
              {navLinks.map((link, index) => {
                const Icon = link.icon
                const isActive = isLinkActive(link.href)
                const content = (
                  <>
                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                    <span className="truncate text-sm font-bold">{link.label}</span>
                    {link.badge === "unread-messages" && unreadCount > 0 && (
                      <Badge className="ml-auto h-5 min-w-[20px] rounded-full border-none bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {unreadCount}
                      </Badge>
                    )}
                  </>
                )
                const className = cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-700 shadow-inner"
                    : "text-stone-700 hover:bg-orange-50/70 hover:text-orange-700"
                )

                if (link.onClick) {
                  return (
                    <button key={index} type="button" onClick={link.onClick} className={className}>
                      {content}
                    </button>
                  )
                }

                return (
                  <Link key={link.href} href={link.href!} className={className}>
                    {content}
                  </Link>
                )
              })}
            </nav>

            <div className="order-last mt-auto border-t border-orange-100/80 pt-4">
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm font-bold text-stone-700 transition-colors hover:bg-red-50 hover:text-red-600"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-5 w-5" />
                Kijelentkezés
              </button>
            </div>

            {showDashboardCta && (
              <div className="mt-5 rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-red-50 p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black leading-tight text-text-primary">Saját szalont szeretnél?</h3>
                <p className="mt-3 text-sm leading-5 text-text-secondary">
                  Hozd létre saját szalonodat, és kezeld időpontjaidat egyszerűen!
                </p>
                <Button asChild className="mt-5 h-11 w-full rounded-xl font-bold">
                  <Link href="/dashboard/salons">Szalon létrehozása</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Nav links (salon / admin context) ── */}
        {!showDashboardSidebar && showNavLinks && navLinks && (
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 rounded-2xl bg-surface border border-border shadow-sm">
            {navLinks.map((link, index) => {
              const Icon = link.icon
              const isActive = isLinkActive(link.href)

              const content = (
                <>
                  <Icon className={cn("h-5 w-5 shrink-0 transition-transform", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                  <span className="text-sm font-medium truncate">{link.label}</span>
                  {link.badge === "unread-messages" && unreadCount > 0 && (
                    <Badge className="ml-auto bg-primary text-primary-foreground border-none h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full">
                      {unreadCount}
                    </Badge>
                  )}
                </>
              )

              const commonClass = cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors min-h-[44px]",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-primary-subtle hover:text-foreground"
              )

              if (link.onClick) {
                return (
                  <button key={index} type="button" onClick={link.onClick} className={cn(commonClass, "w-full")}>
                    {content}
                  </button>
                )
              }

              return (
                <Link key={link.href} href={link.href!} className={commonClass}>
                  {content}
                </Link>
              )
            })}
          </nav>
        )}

        {/* ── Salon Profile Panel (profile page context) ── */}
        {!showDashboardSidebar && showProfilePanel && salonProfile && (
          <div className="flex-1 flex flex-col overflow-hidden rounded-2xl bg-surface border border-border shadow-sm">
            {/* Back button */}
            <div className="px-3 pt-4 pb-2 flex-shrink-0">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Vissza
              </button>
            </div>

            {/* Salon Info */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center pt-4 pb-5">
                <div className="relative h-28 w-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-white mb-3">
                  <Image
                    src={salonProfile.avatar}
                    alt={salonProfile.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <h2 className="font-bold text-lg text-foreground leading-tight">{salonProfile.name}</h2>

                {/* Categories */}
                {salonProfile.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                    {salonProfile.categories.map((cat, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wider"
                      >
                        {CATEGORY_LABELS[cat.toLowerCase()] || cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rating */}
                <div className="flex items-center gap-1.5 mt-3 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-foreground">{salonProfile.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({salonProfile.reviewCount} értékelés)</span>
                </div>

                {/* Location */}
                {salonProfile.city && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {salonProfile.city}
                      {salonProfile.district ? `, ${salonProfile.district}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border mb-5" />

              {/* Action Buttons */}
              {!isOwner && (
                <div className="space-y-2">
                  <Button
                    className="w-full rounded-xl font-bold bg-gray-200 text-gray-400 cursor-not-allowed"
                    disabled
                    title="Hamarosan elérhető!"
                  >
                    Időpontfoglalás
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full rounded-xl gap-2 font-semibold"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-message-modal"))
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Üzenet küldése
                  </Button>

                  <div className="flex justify-center pt-1">
                    <FavoriteButton
                      salonId={salonProfile.id}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl h-10 w-10"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Inline Filter Panel (main context) ── */}
        {!showDashboardSidebar && showFilterPanel && (
          <div className="rounded-2xl bg-surface border border-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <span className="text-sm font-semibold text-foreground">Szűrők</span>
              <button
                onClick={clearFilters}
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                Alaphelyzet
              </button>
            </div>

            {/* Filter content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <FilterPanel />
            </div>
          </div>
        )}

        {/* ── Logged-in user nav links (non-salon, non-admin) ── */}
        {!showDashboardSidebar && !showNavLinks && !showFilterPanel && !showProfilePanel && navLinks && (
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 rounded-2xl bg-surface border border-border shadow-sm">
            {navLinks.map((link, index) => {
              const Icon = link.icon
              const isActive = isLinkActive(link.href)
              const commonClass = cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors min-h-[44px]",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-primary-subtle hover:text-foreground"
              )
              if (link.onClick) {
                return (
                  <button key={index} type="button" onClick={link.onClick} className={cn(commonClass, "w-full")}>
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium truncate">{link.label}</span>
                    {link.badge === "unread-messages" && unreadCount > 0 && (
                      <Badge className="ml-auto bg-primary text-primary-foreground border-none h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </Badge>
                    )}
                  </button>
                )
              }
              return (
                <Link key={link.href} href={link.href!} className={commonClass}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium truncate">{link.label}</span>
                  {link.badge === "unread-messages" && unreadCount > 0 && (
                    <Badge className="ml-auto bg-primary text-primary-foreground border-none h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>
        )}

        {/* ── User card — bottom ── */}
        {!showDashboardSidebar && (
        <div className="flex-shrink-0 rounded-2xl bg-surface border border-border shadow-sm p-3">
          {userData ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent-warm/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {userData.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-bold text-foreground">{userData.name ?? "Felhasználó"}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{userData.email}</p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:bg-primary-subtle hover:text-foreground">
                <Link href="/dashboard/account">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs">Profilbeállítások</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
                <span className="text-xs">Kijelentkezés</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs font-semibold rounded-xl"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Bejelentkezés
            </Button>
          )}
        </div>
        )}
      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <FilterModal isOpen={isFilterModalOpen} onClose={() => toggleFilterModal(false)} />
    </>
  )
}
