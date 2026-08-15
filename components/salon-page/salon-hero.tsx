"use client"

import { useMemo, useState } from "react"
import { CalendarClock, CalendarX, ChevronLeft, ChevronRight, MapPin, MessageCircle, Star, Store } from "lucide-react"

import { SafeImage } from "@/components/ui/safe-image"
import { cn } from "@/lib/utils"
import type { SalonPageData, SalonPageService } from "@/components/salon-page/types"

interface SalonHeroProps {
  salon: SalonPageData
  galleryImages?: string[]
  categoryNameBySlug?: Record<string, string>
}

interface BookingCalendarProps {
  salon: SalonPageData
  onBook: (service?: SalonPageService, date?: string) => void
  onMessage: () => void
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

const openingHourDayByDateIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
const normalizedOpeningHourDays: Record<string, string> = {
  monday: "monday",
  mon: "monday",
  hetfo: "monday",
  hétfő: "monday",
  tuesday: "tuesday",
  tue: "tuesday",
  kedd: "tuesday",
  wednesday: "wednesday",
  wed: "wednesday",
  szerda: "wednesday",
  thursday: "thursday",
  thu: "thursday",
  csutortok: "thursday",
  csütörtök: "thursday",
  friday: "friday",
  fri: "friday",
  pentek: "friday",
  péntek: "friday",
  saturday: "saturday",
  sat: "saturday",
  szombat: "saturday",
  sunday: "sunday",
  sun: "sunday",
  vasarnap: "sunday",
  vasárnap: "sunday",
}

function normalizeOpeningHourDay(day: string) {
  const key = day.trim().toLowerCase()
  const asciiKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  return normalizedOpeningHourDays[key] || normalizedOpeningHourDays[asciiKey] || key
}

export function BookingCalendar({ salon, onBook, onMessage }: BookingCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const monthLabel = visibleMonth.toLocaleDateString("hu-HU", { month: "long", year: "numeric" })
  const days = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const mondayBasedStart = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    return [
      ...Array.from({ length: mondayBasedStart }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ]
  }, [visibleMonth])
  const openDays = useMemo(() => {
    if (!salon.openingHours?.length) return null

    return new Set(
      salon.openingHours
        .filter((hour) => hour.isOpen)
        .map((hour) => normalizeOpeningHourDay(hour.day)),
    )
  }, [salon.openingHours])

  const isClosedDate = (date: Date) => {
    if (!openDays) return false

    return !openDays.has(openingHourDayByDateIndex[date.getDay()])
  }

  return (
    <aside className="w-full min-w-0 rounded-[28px] border border-border-subtle bg-surface/95 p-5 shadow-[0_18px_56px_rgba(48,36,30,0.18)] backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-accent-primary">{salon.allowBookings ? "Válassz dátumot" : "Időpontfoglalás"}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-text-primary">Időpontkérés naptárból</h2>
        </div>
        <CalendarClock className="h-5 w-5 shrink-0 text-accent-primary" />
      </div>

      {salon.allowBookings ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-background text-text-primary transition-colors hover:border-accent-primary hover:text-accent-primary"
              aria-label="Előző hónap"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-center text-xs font-bold capitalize text-text-primary">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-background text-text-primary transition-colors hover:border-accent-primary hover:text-accent-primary"
              aria-label="Következő hónap"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-text-secondary">
            {["H", "K", "Sze", "Cs", "P", "Szo", "V"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="aspect-square" />

              const isPast = date < today
              const isToday = isSameDay(date, today)
              const isClosed = isClosedDate(date)
              const isDisabled = isPast || isClosed
              const dateValue = toDateInputValue(date)

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onBook(undefined, dateValue)}
                  aria-label={isClosed ? `${dateValue} zárva` : `${dateValue} dátum kiválasztása`}
                  className={cn(
                    "aspect-square rounded-xl text-xs font-bold transition-colors",
                    isDisabled
                      ? "cursor-not-allowed text-text-secondary/35"
                      : "bg-surface-muted text-text-primary hover:bg-accent-primary hover:text-primary-foreground",
                    isToday && !isDisabled && "border border-accent-primary text-accent-primary hover:text-primary-foreground",
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-[11px] leading-5 text-text-secondary">
            Kattints egy dátumra, majd válassz szolgáltatást és időpontot. A kérés nem automatikus foglalás.
          </p>
          {salon.allowMessages && (
            <button
              type="button"
              data-testid="public-salon-message-button"
              onClick={onMessage}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-border-subtle bg-background px-5 text-sm font-bold text-text-primary transition-colors hover:border-accent-primary hover:text-accent-primary"
            >
              <MessageCircle className="h-4 w-4" />
              Üzenet küldése
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid min-h-[350px] content-center gap-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-accent-soft text-accent-primary shadow-soft">
            <CalendarX className="h-9 w-9" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-semibold leading-tight text-text-primary">
              Ez a szalon jelenleg nem fogad időpontfoglalást
            </h3>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-text-secondary">
              A naptár nem elérhető ennél a szalonnál. Nézd meg a szolgáltatásokat, vagy kérdezz rá üzenetben a lehetőségekre.
            </p>
          </div>
          <button
            type="button"
            data-testid="public-salon-message-button"
            onClick={onMessage}
            disabled={!salon.allowMessages}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-border-subtle bg-background px-6 text-sm font-bold text-text-primary transition-colors hover:border-accent-primary hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            {salon.allowMessages ? "Üzenet küldése" : "Üzenetküldés nem elérhető"}
          </button>
        </div>
      )}
    </aside>
  )
}

export function SalonHero({ salon, galleryImages = [], categoryNameBySlug = {} }: SalonHeroProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const location = [salon.city, salon.district].filter(Boolean).join(", ")
  const hasRating = Boolean(salon.rating && salon.rating > 0 && salon.reviewCount && salon.reviewCount > 0)
  const images = useMemo(() => Array.from(new Set(galleryImages.filter(Boolean))), [galleryImages])
  const activeImage = images[activeImageIndex] || null
  const hasMultipleImages = images.length > 1

  const showPreviousImage = () => {
    setActiveImageIndex((current) => (current === 0 ? images.length - 1 : current - 1))
  }

  const showNextImage = () => {
    setActiveImageIndex((current) => (current + 1) % images.length)
  }

  const thumbnailStrip = hasMultipleImages ? (
    <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-[24px] bg-transparent px-3 pb-7 pt-3 xl:max-w-[760px]">
      <div className="flex w-max gap-3">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveImageIndex(index)}
            className={cn(
              "salon-thumbnail-button relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl border bg-surface-muted sm:h-20 sm:w-28",
              activeImageIndex === index ? "is-active border-accent-primary" : "border-border-subtle",
            )}
            aria-label={`${index + 1}. galéria kép megnyitása`}
          >
            <SafeImage src={image} alt={`${salon.name} bélyegkép ${index + 1}`} fill sizes="112px" className="salon-thumbnail-image object-cover" />
          </button>
        ))}
      </div>
    </div>
  ) : null

  return (
    <section className="relative left-1/2 isolate w-screen -translate-x-1/2 overflow-visible bg-background xl:min-h-[680px]">
      <div className="absolute inset-x-0 top-0 -z-20 h-[calc(100svh-300px)] min-h-[520px] overflow-hidden md:min-h-[560px] xl:inset-0 xl:h-auto xl:min-h-0">
        {activeImage ? (
          <SafeImage
            src={activeImage}
            alt={`${salon.name} galéria kép`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--surface-muted),var(--accent-soft))] text-text-secondary">
            <Store className="h-12 w-12 opacity-40" />
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 top-0 -z-10 h-[calc(100svh-300px)] min-h-[520px] bg-[linear-gradient(90deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.32)_42%,rgba(255,247,241,0.36)_100%)] md:min-h-[560px] xl:inset-0 xl:h-auto xl:min-h-0" />
      <div className="absolute inset-x-0 top-[calc((100svh-300px)*0.52)] -z-10 h-[calc((100svh-300px)*0.48)] min-h-[250px] bg-gradient-to-t from-black/55 to-transparent xl:bottom-0 xl:top-auto xl:h-1/2 xl:min-h-0" />

      {hasMultipleImages && (
        <div className="pointer-events-none absolute inset-x-4 top-[calc((100svh-300px)*0.5)] z-20 flex -translate-y-1/2 justify-between xl:top-1/2">
          <button
            type="button"
            onClick={showPreviousImage}
            className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/88 text-text-primary shadow-soft backdrop-blur transition-colors hover:bg-white"
            aria-label="Előző kép"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={showNextImage}
            className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/88 text-text-primary shadow-soft backdrop-blur transition-colors hover:bg-white"
            aria-label="Következő kép"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-8 xl:min-h-[680px] xl:items-center xl:px-8">
        <div className="order-1 flex min-h-[calc(100svh-340px)] flex-col justify-end pt-28 text-white sm:pt-32 xl:order-none xl:min-h-[570px] xl:max-w-3xl xl:pt-0">
          <div className="flex flex-wrap gap-2">
            {salon.categories?.slice(0, 3).map((category) => (
              <span key={category} className="rounded-full bg-accent-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-soft">
                {categoryNameBySlug[category] || category}
              </span>
            ))}
          </div>
          <h1 className="mt-4 max-w-2xl text-balance font-serif text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{salon.name}</h1>
          <div className="hidden">
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
            )}
            {hasRating && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {salon.rating?.toFixed(1)} ({salon.reviewCount} vélemény)
              </span>
            )}
          </div>

        </div>

        {thumbnailStrip && <div className="order-2 min-w-0 xl:hidden">{thumbnailStrip}</div>}

      </div>

      {hasMultipleImages && (
        <div className="absolute inset-x-0 -bottom-[144px] z-30 hidden px-4 sm:px-6 xl:block xl:px-8">
          <div className="mx-auto max-w-7xl xl:px-8">
            {thumbnailStrip}
          </div>
        </div>
      )}
    </section>
  )
}
