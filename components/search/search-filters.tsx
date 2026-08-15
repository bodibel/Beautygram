"use client"

import { useEffect, useMemo, useState } from "react"
import { useLoadScript } from "@react-google-maps/api"
import { Check, ChevronsUpDown, MapPin, Search, SlidersHorizontal, Star, X } from "lucide-react"
import { getGeocode, getLatLng } from "use-places-autocomplete"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EU_COUNTRIES } from "@/lib/constants"
import usePlacesAutocompleteNew from "@/lib/hooks/usePlacesAutocompleteNew"
import { cn } from "@/lib/utils"
import type { SearchCategory, SearchLocationFilter } from "@/components/search/search-results"

const MAP_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

interface SearchFiltersProps {
  query: string
  selectedCountry: string
  selectedCategory: string
  locationFilter: SearchLocationFilter | null
  radiusKm: number
  bookingOnly: boolean
  ratedOnly: boolean
  categories: SearchCategory[]
  hasBookingData: boolean
  hasRatings: boolean
  onQueryChange: (value: string) => void
  onCountryChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onLocationChange: (value: SearchLocationFilter | null) => void
  onRadiusChange: (value: number) => void
  onBookingOnlyChange: (value: boolean) => void
  onRatedOnlyChange: (value: boolean) => void
}

export function SearchFilters({
  query,
  selectedCountry,
  selectedCategory,
  locationFilter,
  radiusKm,
  bookingOnly,
  ratedOnly,
  categories,
  hasBookingData,
  hasRatings,
  onQueryChange,
  onCountryChange,
  onCategoryChange,
  onLocationChange,
  onRadiusChange,
  onBookingOnlyChange,
  onRatedOnlyChange,
}: SearchFiltersProps) {
  const [countryOpen, setCountryOpen] = useState(false)

  const selectedCountryCode = useMemo(
    () => EU_COUNTRIES.find((country) => country.name === selectedCountry)?.code.toLowerCase() || "hu",
    [selectedCountry]
  )

  const hasGoogleMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: MAP_LIBRARIES,
  })

  const {
    ready,
    value: locationSearchValue,
    suggestions: { status: locationStatus, data: locationSuggestions },
    setValue: setLocationSearchValue,
    clearSuggestions,
  } = usePlacesAutocompleteNew({
    requestOptions: {
      componentRestrictions: { country: selectedCountryCode },
      types: ["locality"],
    },
    debounce: 300,
    defaultValue: locationFilter?.label || "",
    initOnMount: isLoaded,
  })

  useEffect(() => {
    setLocationSearchValue(locationFilter?.label || "", false)
  }, [locationFilter?.label, setLocationSearchValue])

  const selectedLocationLabel = locationFilter?.city || locationFilter?.label || ""
  const shouldShowLocationSuggestions = locationStatus === "OK" && locationSearchValue !== locationFilter?.label

  const handleLocationSelect = async (description: string) => {
    setLocationSearchValue(description, false)
    clearSuggestions()

    try {
      const results = await getGeocode({ address: description })
      const { lat, lng } = await getLatLng(results[0])
      const cityComponent = results[0].address_components.find((component) =>
        component.types.includes("locality") || component.types.includes("postal_town")
      )

      onLocationChange({
        label: description,
        city: cityComponent?.long_name || description.split(",")[0],
        lat,
        lng,
      })
    } catch (error) {
      console.error("Google helyszín geokódolási hiba:", error)
    }
  }

  const handleLocationInputChange = (value: string) => {
    if (locationFilter) onLocationChange(null)
    setLocationSearchValue(value)
  }

  const handleLocationClear = () => {
    onLocationChange(null)
    setLocationSearchValue("", false)
    clearSuggestions()
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-border-subtle bg-surface p-4 shadow-soft sm:p-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_220px_minmax(220px,1.1fr)_220px]">
        <label className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-border-subtle bg-background px-4 focus-within:border-accent-primary">
          <Search className="h-4 w-4 shrink-0 text-accent-primary" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Szalon vagy szolgáltatás"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:text-text-secondary"
          />
        </label>

        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex min-h-[54px] justify-between rounded-2xl border-border-subtle bg-background px-4 text-sm font-bold text-text-primary"
            >
              <span className="min-w-0 truncate">{selectedCountry}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-secondary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px] p-0">
            <Command>
              <CommandInput placeholder="Ország keresése..." />
              <CommandList>
                <CommandEmpty>Nincs találat.</CommandEmpty>
                <CommandGroup>
                  {EU_COUNTRIES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={country.name}
                      onSelect={() => {
                        onCountryChange(country.name)
                        setCountryOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedCountry === country.name ? "opacity-100" : "opacity-0")} />
                      {country.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="relative">
          <label className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-border-subtle bg-background px-4 focus-within:border-accent-primary">
            <MapPin className="h-4 w-4 shrink-0 text-accent-primary" />
            <input
              value={locationSearchValue}
              onChange={(event) => handleLocationInputChange(event.target.value)}
              placeholder={hasGoogleMapsKey ? "Város" : "Google Maps kulcs szükséges"}
              disabled={!hasGoogleMapsKey || !ready}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-60"
            />
            {locationFilter && (
              <button
                type="button"
                onClick={handleLocationClear}
                className="rounded-full p-1 text-text-secondary transition-colors hover:bg-accent-soft hover:text-accent-primary"
                aria-label="Helyszűrő törlése"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          {shouldShowLocationSuggestions && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-border-subtle bg-surface-elevated p-1 shadow-soft">
              {locationSuggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id || suggestion.description}
                  type="button"
                  onClick={() => handleLocationSelect(suggestion.description)}
                  className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-text-primary transition-colors hover:bg-accent-soft"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                  <span>{suggestion.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="flex min-h-[54px] flex-col justify-center gap-1 rounded-2xl border border-border-subtle bg-background px-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">Sugár</span>
            <span className="text-sm font-bold text-text-primary">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={radiusKm}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            disabled={!locationFilter}
            className="h-2 w-full cursor-pointer accent-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Keresési sugár"
          />
        </label>
      </div>

      {selectedLocationLabel && (
        <p className="text-xs font-semibold text-text-secondary">
          Helyszűrés: {selectedLocationLabel}, {radiusKm} km-es körzetben. Csak koordinátával mentett szalonok jelennek meg.
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onCategoryChange("")}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
            !selectedCategory ? "border-accent-primary bg-accent-soft text-accent-primary" : "border-border-subtle bg-background text-text-secondary hover:text-text-primary"
          )}
        >
          Összes szalon
        </button>
        {categories.slice(0, 8).map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => onCategoryChange(selectedCategory === category.slug ? "" : category.slug)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              selectedCategory === category.slug ? "border-accent-primary bg-accent-soft text-accent-primary" : "border-border-subtle bg-background text-text-secondary hover:text-text-primary"
            )}
          >
            {category.name}
          </button>
        ))}
        {hasBookingData && (
          <button
            type="button"
            onClick={() => onBookingOnlyChange(!bookingOnly)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              bookingOnly ? "border-accent-primary bg-accent-soft text-accent-primary" : "border-border-subtle bg-background text-text-secondary hover:text-text-primary"
            )}
          >
            Időpontkérés
          </button>
        )}
        {hasRatings && (
          <button
            type="button"
            onClick={() => onRatedOnlyChange(!ratedOnly)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              ratedOnly ? "border-accent-primary bg-accent-soft text-accent-primary" : "border-border-subtle bg-background text-text-secondary hover:text-text-primary"
            )}
          >
            <Star className="h-4 w-4" />
            Értékelt
          </button>
        )}
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-dashed border-border-subtle px-4 py-2 text-sm font-bold text-text-secondary">
          <SlidersHorizontal className="h-4 w-4" />
          Nyitva most - hamarosan
        </span>
      </div>
    </div>
  )
}
