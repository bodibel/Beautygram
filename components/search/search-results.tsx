"use client"

import { useMemo, useState } from "react"
import { Store } from "lucide-react"

import { SearchFilters } from "@/components/search/search-filters"
import { SearchStudioCard } from "@/components/search/search-studio-card"
import { isValidGeoPoint, isWithinRadiusKm } from "@/lib/geo/distance"

export interface SearchStudio {
  id: string
  name: string
  slug: string
  image?: string | null
  profileImage?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  category?: string | null
  categories: string[]
  rating?: number | null
  reviewCount?: number | null
  description?: string | null
  allowBookings?: boolean
}

export interface SearchCategory {
  name: string
  slug: string
}

export interface SearchLocationFilter {
  label: string
  city?: string | null
  lat?: number | null
  lng?: number | null
}

interface SearchResultsProps {
  studios: SearchStudio[]
  categories?: SearchCategory[]
}

export function SearchResults({ studios, categories = [] }: SearchResultsProps) {
  const [query, setQuery] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("Magyarország")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [locationFilter, setLocationFilter] = useState<SearchLocationFilter | null>(null)
  const [radiusKm, setRadiusKm] = useState(10)
  const [bookingOnly, setBookingOnly] = useState(false)
  const [ratedOnly, setRatedOnly] = useState(false)

  const categoryNameBySlug = useMemo(() => new Map(categories.map((category) => [category.slug, category.name])), [categories])
  const hasBookingData = useMemo(() => studios.some((studio) => studio.allowBookings), [studios])
  const hasRatings = useMemo(() => studios.some((studio) => studio.rating && studio.rating > 0), [studios])

  const filteredStudios = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const normalizedCountry = selectedCountry.trim().toLowerCase()

    return studios.filter((studio) => {
      const matchesCountry = !normalizedCountry || studio.country?.toLowerCase() === normalizedCountry
      const matchesQuery =
        !normalizedQuery ||
        studio.name.toLowerCase().includes(normalizedQuery) ||
        studio.city?.toLowerCase().includes(normalizedQuery) ||
        studio.district?.toLowerCase().includes(normalizedQuery) ||
        studio.address?.toLowerCase().includes(normalizedQuery) ||
        studio.categories.some((category) => {
          const displayName = categoryNameBySlug.get(category) || category
          return category.toLowerCase().includes(normalizedQuery) || displayName.toLowerCase().includes(normalizedQuery)
        })

      const matchesCategory = !selectedCategory || studio.categories.includes(selectedCategory)
      const matchesLocation =
        !isValidGeoPoint(locationFilter) ||
        (isValidGeoPoint(studio) && isWithinRadiusKm(locationFilter, studio, radiusKm))
      const matchesBooking = !bookingOnly || Boolean(studio.allowBookings)
      const matchesRating = !ratedOnly || Boolean(studio.rating && studio.rating > 0)

      return matchesCountry && matchesQuery && matchesCategory && matchesLocation && matchesBooking && matchesRating
    })
  }, [bookingOnly, categoryNameBySlug, locationFilter, query, radiusKm, ratedOnly, selectedCategory, selectedCountry, studios])

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
    setLocationFilter(null)
  }

  return (
    <section id="search-results" className="space-y-5 scroll-mt-24">
      <div className="flex justify-end">
        <div className="text-sm font-bold text-text-secondary">
          {filteredStudios.length} / {studios.length} megjelenítve
        </div>
      </div>

      <SearchFilters
        query={query}
        selectedCountry={selectedCountry}
        selectedCategory={selectedCategory}
        locationFilter={locationFilter}
        radiusKm={radiusKm}
        bookingOnly={bookingOnly}
        ratedOnly={ratedOnly}
        categories={categories}
        hasBookingData={hasBookingData}
        hasRatings={hasRatings}
        onQueryChange={setQuery}
        onCountryChange={handleCountryChange}
        onCategoryChange={setSelectedCategory}
        onLocationChange={setLocationFilter}
        onRadiusChange={setRadiusKm}
        onBookingOnlyChange={setBookingOnly}
        onRatedOnlyChange={setRatedOnly}
      />

      {filteredStudios.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredStudios.map((studio) => (
            <SearchStudioCard key={studio.id} studio={studio} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-border-subtle bg-surface px-6 text-center">
          <Store className="h-10 w-10 text-accent-primary opacity-70" />
          <h3 className="mt-4 text-xl font-bold text-text-primary">Nincs találat</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
            Próbálj nagyobb keresési sugarat, másik várost, vagy töröld a helyszűrőt az összes elérhető szalonhoz.
          </p>
        </div>
      )}
    </section>
  )
}
