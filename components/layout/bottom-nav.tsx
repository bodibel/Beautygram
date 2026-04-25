"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, Heart, Home, Plus, Search, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useFilter } from "@/lib/filter-context"
import { PostModal } from "@/components/salon/modals/PostModal"
import { createPost, getUserSalons } from "@/lib/actions/salon"
import { AuthModal } from "@/components/auth/auth-modal"
import { toast } from "sonner"

const navItems = [
  { href: "/", label: "Kezdőlap", icon: Home },
  { href: "/providers", label: "Szalonok", icon: Compass },
  null,
  { href: "/dashboard/favorites", label: "Kedvencek", icon: Heart },
  { href: "/profile/me", label: "Profil", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user, userData } = useAuth()
  const { toggleFilterModal } = useFilter()
  const [primarySalonId, setPrimarySalonId] = useState<string | null>(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const isProvider = userData?.role === "provider"

  useEffect(() => {
    if (userData?.id && isProvider) {
      getUserSalons(userData.id)
        .then((salons) => {
          const firstSalon = Array.isArray(salons) ? salons[0] : null
          setPrimarySalonId(firstSalon?.id || null)
        })
        .catch(() => setPrimarySalonId(null))
      return
    }

    setPrimarySalonId(null)
  }, [userData, isProvider])

  const handleCreatePost = async (content: string, imageUrls: string[], layout: string) => {
    if (!primarySalonId) {
      toast.error("Előbb hozz létre egy szalont a bejegyzéshez.")
      return
    }

    try {
      await createPost({
        salonId: primarySalonId,
        content,
        images: imageUrls,
        layout,
      })
      toast.success("Bejegyzés sikeresen létrehozva.")
      setIsPostModalOpen(false)
    } catch (error: any) {
      console.error("Error creating post from mobile nav:", error)
      toast.error(error?.message || "Nem sikerült létrehozni a bejegyzést.")
    }
  }

  return (
    <>
      <nav
        className="glass fixed inset-x-0 bottom-0 flex h-16 items-center justify-around rounded-none border-t border-border lg:hidden"
        style={{
          zIndex: "var(--z-bottom-nav)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {navItems.map((item) => {
          if (!item) {
            if (isProvider) {
              return (
                <button
                  key="center"
                  type="button"
                  onClick={() => setIsPostModalOpen(true)}
                  className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-warm text-white shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
                  aria-label="Új bejegyzés létrehozása"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </button>
              )
            }

            return (
              <button
                key="center"
                type="button"
                onClick={() => toggleFilterModal(true)}
                className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-warm text-white shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
                aria-label="Felfedezés és szűrés"
              >
                <Search className="h-6 w-6" strokeWidth={2.5} />
              </button>
            )
          }

          const Icon = item.icon
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)

          const shouldOpenAuthModal = item.href === "/profile/me" && !user

          if (shouldOpenAuthModal) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className={cn(
                  "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-2 transition-colors",
                  "text-muted-foreground"
                )}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-label={item.label}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {isProvider && (
        <PostModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          onSave={handleCreatePost}
        />
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}
