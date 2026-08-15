"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, Hand, Scissors, Search, Sparkles, Wand2 } from "lucide-react"

import { AvailabilityTeaser } from "@/components/inspiration/availability-teaser"
import { BeforeAfterTeaser } from "@/components/inspiration/before-after-teaser"
import { CategoryCard } from "@/components/inspiration/category-card"
import { EditorialRail } from "@/components/inspiration/editorial-rail"
import { InspirationHero } from "@/components/inspiration/inspiration-hero"
import { LookCard, type LookCardData } from "@/components/inspiration/look-card"
import { StudioCard, type StudioCardData } from "@/components/inspiration/studio-card"
import { PublicDiscoveryLayout } from "@/components/layout/public-discovery-layout"
import { getAllSalons, getRecentPosts } from "@/lib/actions/salon"
import { useFilter } from "@/lib/filter-context"

type RawRecentPost = Awaited<ReturnType<typeof getRecentPosts>>[number]
type RawSalon = Awaited<ReturnType<typeof getAllSalons>>[number]

const categories = [
  { label: "Köröm", description: "Manikűr, géllakk, díszítés", href: "/providers", icon: Hand },
  { label: "Haj", description: "Vágás, festés, styling", href: "/providers", icon: Scissors },
  { label: "Szemöldök", description: "Formázás és festés", href: "/providers", icon: Eye },
  { label: "Szempilla", description: "Lifting, dúsítás, hosszabbítás", href: "/providers", icon: Sparkles },
  { label: "Barber", description: "Precíz vágás és ápolás", href: "/providers", icon: Scissors },
  { label: "Arckezelés", description: "Kezelések és ragyogás", href: "/providers", icon: Wand2 },
]

function firstImage(images?: string[] | null) {
  return images && images.length > 0 ? images[0] : null
}

function lookTitle(post: RawRecentPost) {
  const content = post.content?.trim()
  if (!content) return "Portfólió munka"
  return content.length > 92 ? `${content.slice(0, 89)}...` : content
}

function toLook(post: RawRecentPost): LookCardData {
  return {
    id: post.id,
    image: firstImage(post.images),
    title: lookTitle(post),
    salonName: post.salon.name,
    salonSlug: post.salon.slug,
    category: post.salon.categories?.[0],
    rating: post.salon.rating,
    likes: post._count?.likes || 0,
    comments: post._count?.comments || 0,
  }
}

function toStudio(salon: RawSalon): StudioCardData {
  return {
    id: salon.id,
    name: salon.name,
    slug: salon.slug,
    image: salon.coverImage || firstImage(salon.images) || salon.profileImage,
    profileImage: salon.profileImage,
    city: salon.city,
    category: salon.categories?.[0],
    rating: salon.rating,
    reviewCount: salon.reviewCount,
    allowBookings: salon.allowBookings,
  }
}

export default function Home() {
  const { location, filters } = useFilter()
  const [looks, setLooks] = useState<LookCardData[]>([])
  const [studios, setStudios] = useState<StudioCardData[]>([])
  const [loading, setLoading] = useState(true)

  const loadInspirationData = useCallback(async () => {
    try {
      setLoading(true)
      const [recentPosts, salons] = await Promise.all([
        getRecentPosts(1, {
          lat: location.lat,
          lng: location.lng,
          radius: location.radius,
          categories: filters.services,
        }),
        getAllSalons(),
      ])

      setLooks(recentPosts.map(toLook).filter((look) => Boolean(look.image)).slice(0, 10))
      setStudios(salons.map(toStudio).slice(0, 10))
    } catch (error) {
      console.error("Error loading inspiration homepage:", error)
    } finally {
      setLoading(false)
    }
  }, [filters.services, location.lat, location.lng, location.radius])

  useEffect(() => {
    loadInspirationData()
  }, [loadInspirationData])

  return (
    <PublicDiscoveryLayout flushTop>
      <div className="space-y-12 pb-8 sm:space-y-16">
        <InspirationHero image="/images/hero/search-hero-beauty.png" />

        <EditorialRail
          title="Népszerű most"
          description="Indulj egy szolgáltatási hangulatból, majd szűkíts megbízható szalonokra és inspiráló munkákra."
          href="/providers"
          actionLabel="Felfedezés"
        >
          {categories.map((category) => (
            <CategoryCard key={category.label} {...category} />
          ))}
        </EditorialRail>

        <EditorialRail
          title="Kiemelt munkák"
          description="Valós munkák GlowySpot szalonoktól, inspirációként megmutatva, nem közösségi posztként."
          href="/providers"
          actionLabel="Felfedezés"
        >
          {loading && looks.length === 0
            ? [1, 2, 3].map((item) => (
                <div key={item} className="h-[420px] w-[268px] shrink-0 animate-pulse rounded-[28px] bg-surface-muted sm:w-[320px]" />
              ))
            : looks.map((look) => <LookCard key={look.id} look={look} />)}
          {!loading && looks.length === 0 && (
            <div className="w-[300px] rounded-[28px] border border-border-subtle bg-surface p-6 text-sm leading-6 text-text-secondary shadow-soft">
              Itt jelennek meg a munkák, amikor a szalonok portfólióképeket töltenek fel.
            </div>
          )}
        </EditorialRail>

        <EditorialRail
          title="Kiemelt szalonok"
          description="Böngészd az aktív szalonokat, és nyisd meg a profilt, ha egy stílus közel áll hozzád."
          href="/providers"
          actionLabel="Szalonok"
        >
          {loading && studios.length === 0
            ? [1, 2, 3].map((item) => (
                <div key={item} className="h-[310px] w-[284px] shrink-0 animate-pulse rounded-[28px] bg-surface-muted sm:w-[340px]" />
              ))
            : studios.map((studio) => <StudioCard key={studio.id} studio={studio} />)}
          {!loading && studios.length === 0 && (
            <div className="w-[300px] rounded-[28px] border border-border-subtle bg-surface p-6 text-sm leading-6 text-text-secondary shadow-soft">
              Itt jelennek meg a szalonok, amikor aktív szalonadat érhető el.
            </div>
          )}
        </EditorialRail>

        <AvailabilityTeaser />
        <BeforeAfterTeaser />

        <section className="rounded-[32px] border border-border-subtle bg-surface p-6 text-center shadow-soft sm:p-8">
          <Search className="mx-auto h-6 w-6 text-accent-primary" />
          <h2 className="mt-3 font-serif text-3xl font-semibold text-text-primary">Készen állsz szűkíteni a keresést?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
            Böngészd a meglévő szalonkatalógust, amíg a teljes prémium keresési és térképes élmény készül.
          </p>
          <a
            href="/providers"
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Szalon keresése
          </a>
        </section>
      </div>
    </PublicDiscoveryLayout>
  )
}
