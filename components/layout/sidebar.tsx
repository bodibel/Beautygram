"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useParams, useRouter } from "next/navigation"
import { LogOut, ArrowLeft, Star, MapPin, MessageCircle, Store } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth/auth-modal"
import { FilterModal } from "@/components/layout/filter-modal"
import { getSalonLinks } from "@/lib/navigation-config"
import { adminLinks, authLinks, loggedInVisitorLinks, providerLinks } from "@/lib/navigation-config"
import { useAuth } from "@/lib/auth-context"
import { useFilter } from "@/lib/filter-context"
import { useNotifications } from "@/lib/notification-context"
import { useSalonProfile } from "@/lib/salon-profile-context"
import { FavoriteButton } from "@/components/salon/FavoriteButton"
import { signOut } from "next-auth/react"
import { getSalonName } from "@/lib/actions/salon"
import { normalizeImageSrc } from "@/lib/image-utils"

const FilterPanel = dynamic(
  () => import("@/components/layout/filter-panel").then((mod) => mod.FilterPanel),
  { ssr: false }
)

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
  const { user, userData } = useAuth()
  const { isFilterModalOpen, toggleFilterModal, clearFilters } = useFilter()
  const { unreadCount } = useNotifications()
  const salonProfileCtx = useSalonProfile()
  const salonProfile = salonProfileCtx?.salonProfile

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [activeSalonHeader, setActiveSalonHeader] = useState<{ name: string; profileImage: string | null } | null>(null)

  const isSalonContext = !!(pathname.startsWith("/salon/") && params.id)
  const salonId = params.id as string | undefined
  const isAdmin = userData?.role === "admin"
  const isOnDashboard = pathname?.startsWith("/dashboard")
  const isOnProfilePage = pathname?.startsWith("/profile/")
  const isAccountContext = pathname === "/profile/me" || pathname?.startsWith("/account/")
  const accountLinks = userData?.role === "provider"
    ? [...providerLinks, ...authLinks]
    : [...loggedInVisitorLinks, ...authLinks]

  // Nav links per context
  const navLinks = isSalonContext && salonId
    ? getSalonLinks(salonId)
    : isAdmin
      ? adminLinks
      : (isOnDashboard || isAccountContext) && userData
        ? accountLinks
        : null   // main pages → show filter panel

  const showNavLinks = !!(navLinks && (isSalonContext || isAdmin || isOnDashboard || isAccountContext))
  const showProfilePanel = isOnProfilePage && !!salonProfile
  const showFilterPanel = !showNavLinks && !showProfilePanel

  const isOwner = userData?.id === salonProfile?.ownerId

  useEffect(() => {
    const loadActiveSalonHeader = async () => {
      if (!isSalonContext || !salonId) {
        setActiveSalonHeader(null)
        return
      }

      try {
        const data = await getSalonName(salonId)
        if (data) {
          setActiveSalonHeader({
            name: data.name,
            profileImage: data.profileImage,
          })
        } else {
          setActiveSalonHeader(null)
        }
      } catch (error) {
        console.error("Error loading active salon header:", error)
        setActiveSalonHeader(null)
      }
    }

    loadActiveSalonHeader()
  }, [isSalonContext, salonId])

  return (
    <>
      {showNavLinks && navLinks && (isSalonContext || isAccountContext) && (
        <nav className="sticky top-[52px] z-30 flex w-full gap-2 overflow-x-auto border-b border-border bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
          {navLinks.map((link, index) => {
            const Icon = link.icon
            const isActive = link.href
              ? link.href === "/" ? pathname === "/" : pathname === link.href
              : false

            if (link.onClick) {
              return (
                <button
                  key={`mobile-${index}`}
                  type="button"
                  onClick={link.onClick}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold",
                    isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{link.label}</span>
                  {link.badge === "unread-messages" && unreadCount > 0 && (
                    <Badge className="h-5 min-w-[20px] rounded-full border-none bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              )
            }

            return (
              <Link
                key={`mobile-${link.href}`}
                href={link.href!}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold",
                  isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{link.label}</span>
                {link.badge === "unread-messages" && unreadCount > 0 && (
                  <Badge className="h-5 min-w-[20px] rounded-full border-none bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      )}

      <aside
        className="hidden lg:flex flex-col w-[280px] flex-shrink-0 sticky top-[64px] self-start h-[calc(100vh-4rem)] overflow-y-auto gap-3 px-3 pt-2 pb-4"
        style={{ zIndex: "var(--z-sidebar)" }}
      >
        {/* ── Nav links (salon / admin context) ── */}
        {showNavLinks && navLinks && (
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 rounded-2xl bg-surface border border-border shadow-sm">
            {isSalonContext && activeSalonHeader && (
              <div className="mb-4 px-2">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-3 py-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-primary/10">
                    {normalizeImageSrc(activeSalonHeader.profileImage) ? (
                      <Image
                        src={normalizeImageSrc(activeSalonHeader.profileImage)!}
                        alt={activeSalonHeader.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Store className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Aktív szalon
                    </p>
                    <p className="truncate text-sm font-bold text-foreground">{activeSalonHeader.name}</p>
                  </div>
                </div>
              </div>
            )}
            {navLinks.map((link, index) => {
              const Icon = link.icon
              let isActive = false
              if (link.href) {
                isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
                if (salonId && link.href === `/salon/${salonId}`) {
                  isActive = pathname === link.href
                }
              }

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
        {showProfilePanel && salonProfile && (
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
        {showFilterPanel && (
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
        {!showNavLinks && !showFilterPanel && !showProfilePanel && navLinks && (
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 rounded-2xl bg-surface border border-border shadow-sm">
            {navLinks.map((link, index) => {
              const Icon = link.icon
              const isActive = link.href
                ? link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
                : false
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
      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <FilterModal isOpen={isFilterModalOpen} onClose={() => toggleFilterModal(false)} />
    </>
  )
}
