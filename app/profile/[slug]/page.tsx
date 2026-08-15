"use client"

import { use, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Settings, X } from "lucide-react"
import { toast } from "sonner"

import { PublicDiscoveryLayout } from "@/components/layout/public-discovery-layout"
import { ReviewModal } from "@/components/profile/ReviewModal"
import { MessageModal } from "@/components/salon/message-modal"
import { BookingRequestModal } from "@/components/salon-page/booking-request-modal"
import { SalonAbout } from "@/components/salon-page/salon-about"
import { BookingCalendar, SalonHero } from "@/components/salon-page/salon-hero"
import { SalonLocation, SalonOpeningHours } from "@/components/salon-page/salon-location"
import { SalonPortfolio } from "@/components/salon-page/salon-portfolio"
import { SalonReviews } from "@/components/salon-page/salon-reviews"
import { SalonServices } from "@/components/salon-page/salon-services"
import { SalonTeam } from "@/components/salon-page/salon-team"
import { SalonTrustStrip } from "@/components/salon-page/salon-trust-strip"
import type { SalonPageData, SalonPageService } from "@/components/salon-page/types"
import { getCategories } from "@/lib/actions/category"
import { getPublicSalonData } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"

export default function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { userData } = useAuth()
  const [salon, setSalon] = useState<SalonPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [bookingService, setBookingService] = useState<SalonPageService | null>(null)
  const [bookingDate, setBookingDate] = useState("")
  const [categoryNameBySlug, setCategoryNameBySlug] = useState<Record<string, string>>({})
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const loadSalonData = useCallback(async () => {
    try {
      setLoading(true)
      const [data, categories] = await Promise.all([getPublicSalonData(slug), getCategories()])
      setSalon(data as SalonPageData | null)
      setCategoryNameBySlug(Object.fromEntries(categories.map((category) => [category.slug, category.name])))
    } catch (error) {
      console.error("Error loading salon data:", error)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadSalonData()
  }, [loadSalonData])

  const handleBook = (service?: SalonPageService, date?: string) => {
    setBookingService(service || null)
    setBookingDate(date || "")
    setIsBookingModalOpen(true)
  }

  const handleReview = () => {
    if (!userData?.id) {
      toast.error("Vélemény írásához jelentkezz be.")
      return
    }
    setIsReviewModalOpen(true)
  }

  if (loading) {
    return (
      <PublicDiscoveryLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent-primary" />
          <p className="text-sm font-semibold text-text-secondary">Szalon betöltése...</p>
        </div>
      </PublicDiscoveryLayout>
    )
  }

  if (!salon) {
    return (
      <PublicDiscoveryLayout>
        <div className="flex min-h-[60vh] items-center justify-center rounded-[32px] border border-dashed border-border-subtle bg-surface p-8 text-center text-text-secondary">
          A szalon nem található.
        </div>
      </PublicDiscoveryLayout>
    )
  }

  const galleryImages = Array.from(
    new Set([
      ...(salon.posts || []).flatMap((post) => post.images || []),
      ...(salon.images || []),
    ].filter(Boolean)),
  )
  const aboutImage = salon.images?.[0] || salon.profileImage || null
  const isOwner = userData?.id === salon.ownerId

  return (
    <PublicDiscoveryLayout flushTop>
      <div className="space-y-10 pb-28 md:pb-12">
        {isOwner && (
          <div className="fixed right-4 top-20 z-40 sm:right-6 lg:right-8">
            <Link
              href={`/dashboard/salons/${salon.id}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-primary px-5 text-sm font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
            >
              <Settings className="h-4 w-4" />
              Vezérlőpult
            </Link>
          </div>
        )}

        <SalonHero
          salon={salon}
          galleryImages={galleryImages}
          categoryNameBySlug={categoryNameBySlug}
        />
        <div className={galleryImages.length > 1 ? "xl:pt-36" : undefined}>
          <SalonTrustStrip salon={salon} />
        </div>

        <main className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.58fr)] lg:items-start">
          <div className="space-y-12">
            <SalonServices salon={salon} onBook={handleBook} />
            <SalonPortfolio salon={salon} onOpenImage={setLightboxImage} />
          </div>
          <aside className="relative z-20 space-y-8 lg:-mt-[340px] xl:-mt-[380px]">
            <BookingCalendar salon={salon} onBook={handleBook} onMessage={() => setIsMessageModalOpen(true)} />
            <SalonAbout salon={salon} image={aboutImage} />
            <SalonOpeningHours salon={salon} />
            <SalonLocation salon={salon} />
            <SalonReviews salon={salon} isOwner={isOwner} onReview={handleReview} />
            <SalonTeam salon={salon} />
          </aside>
        </main>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightboxImage(null)}
            aria-label="Kép bezárása"
          >
            <X className="h-7 w-7" />
          </button>
          <div className="relative h-[88vh] w-[92vw]" onClick={(event) => event.stopPropagation()}>
            <Image src={lightboxImage} alt="Nagyított szalon kép" fill sizes="92vw" className="rounded-2xl object-contain" />
          </div>
        </div>
      )}

      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        receiverId={salon.ownerId}
        receiverName={salon.name}
        salonId={salon.id}
      />

      <BookingRequestModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        salon={salon}
        initialService={bookingService}
        initialDate={bookingDate}
      />

      {userData && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          salonId={salon.id}
          userId={userData.id}
          onSuccess={loadSalonData}
        />
      )}
    </PublicDiscoveryLayout>
  )
}
