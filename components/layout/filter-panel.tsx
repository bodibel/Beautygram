"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useFilter } from "@/lib/filter-context"
import { getCategories } from "@/lib/actions/category"
import {
  Scissors, Sparkles, Hand, User, Palette, Waves, Smile,
  MapPin, Check, ChevronsUpDown, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLoadScript } from "@react-google-maps/api"
import usePlacesAutocompleteNew from "@/lib/hooks/usePlacesAutocompleteNew"
import { getGeocode, getLatLng } from "use-places-autocomplete"

const ICON_MAP: Record<string, React.ElementType> = {
  Scissors, Sparkles, Hand, User, Palette, Waves, Smile,
}

type CategoryFilter = {
  id: string
  name: string
  slug: string
  icon?: string | null
}

const EU_COUNTRIES = [
  { code: "HU", name: "Magyarország" },
  { code: "AT", name: "Ausztria" },
  { code: "DE", name: "Németország" },
  { code: "SK", name: "Szlovákia" },
  { code: "RO", name: "Románia" },
  { code: "HR", name: "Horvátország" },
  { code: "SI", name: "Szlovénia" },
]

const MAP_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

interface FilterPanelProps {
  onApply?: () => void
  compact?: boolean   // kisebb betűméret / padding a sidebar nézethez
}

export function FilterPanel({ onApply, compact = false }: FilterPanelProps) {
  const {
    location,
    filters,
    updateLocation,
    addServiceFilter,
    removeServiceFilter,
    updateSearchQuery,
  } = useFilter()

  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const [categories, setCategories] = useState<CategoryFilter[]>([])

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: MAP_LIBRARIES,
  })

  const selectedCountryCode =
    EU_COUNTRIES.find((c) => c.name === location.country)?.code || "HU"

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocompleteNew({
    requestOptions: {
      componentRestrictions: { country: selectedCountryCode.toLowerCase() },
      types: ["(cities)"],
    },
    debounce: 300,
    defaultValue: location.city,
    initOnMount: isLoaded,
  })

  useEffect(() => {
    setValue(location.city, false)
  }, [location.city, setValue])

  const handleSelect = async (description: string) => {
    setValue(description, false)
    clearSuggestions()
    try {
      const results = await getGeocode({ address: description })
      const { lat, lng } = await getLatLng(results[0])
      const cityComponent = results[0].address_components.find((c) =>
        c.types.includes("locality") || c.types.includes("postal_town")
      )
      updateLocation({
        city: cityComponent?.long_name || description.split(",")[0],
        lat,
        lng,
      })
    } catch (e) {
      console.error("Geocoding error:", e)
    }
  }

  const labelCls = compact ? "text-xs font-semibold" : "text-sm font-semibold"
  const subLabelCls = compact ? "text-[11px] text-muted-foreground" : "text-sm text-muted-foreground font-normal"
  const inputH = compact ? "h-8 text-xs" : ""

  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>

      {/* ── Keresés ── */}
      <div className="space-y-1">
        <Label className={labelCls}>Keresés</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            placeholder="Szalon neve, szolgáltatás..."
            className={cn("pl-8", compact ? "h-8 text-xs" : "")}
          />
        </div>
      </div>

      {/* ── Távolság és Helyszín ── */}
      <div className="space-y-3">
        <Label className={labelCls}>Távolság és Helyszín</Label>

        {/* Ország */}
        <div className="space-y-1">
          <Label className={subLabelCls}>Ország</Label>
          <Popover open={isCountryOpen} onOpenChange={setIsCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn("w-full justify-between font-normal", inputH)}
              >
                {location.country || "Válassz országot"}
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Ország keresése..." />
                <CommandEmpty>Nincs találat.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {EU_COUNTRIES.map((country) => (
                      <CommandItem
                        key={country.code}
                        value={country.name}
                        onSelect={(v) => {
                          updateLocation({ country: v, city: "", lat: undefined, lng: undefined })
                          setIsCountryOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            location.country === country.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {country.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Város */}
        <div className="space-y-1 relative">
          <Label className={subLabelCls}>Város</Label>
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Város keresése..."
              disabled={!ready}
              className={cn("pr-8", inputH)}
            />
            <MapPin className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {status === "OK" && (
            <div className="absolute top-full left-0 w-full bg-surface border border-border rounded-lg shadow-lg z-50 mt-1 max-h-40 overflow-y-auto">
              {data.map(({ place_id, description }) => (
                <div
                  key={place_id}
                  className="px-3 py-2 hover:bg-primary-subtle cursor-pointer text-sm"
                  onClick={() => handleSelect(description)}
                >
                  {description}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keresési sugár */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className={subLabelCls}>Keresési sugár</Label>
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              {location.radius} km
            </span>
          </div>
          <Slider
            value={[location.radius]}
            onValueChange={(vals) => updateLocation({ radius: vals[0] })}
            max={50}
            min={1}
            step={1}
            className="py-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1 km</span>
            <span>10 km</span>
            <span>25 km</span>
            <span>50 km</span>
          </div>
        </div>
      </div>

      {/* ── Szolgáltatások ── */}
      <div className="space-y-2">
        <Label className={labelCls}>Szolgáltatások</Label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isSelected = filters.services.includes(cat.slug)
            const Icon = ICON_MAP[cat.icon || ""] || Sparkles
            return (
              <Badge
                key={cat.id}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer gap-1.5 transition-all",
                  compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-sm",
                  isSelected
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "hover:bg-primary-subtle"
                )}
                onClick={() =>
                  isSelected ? removeServiceFilter(cat.slug) : addServiceFilter(cat.slug)
                }
              >
                <Icon className={compact ? "w-3 h-3" : "w-4 h-4"} />
                {cat.name}
              </Badge>
            )
          })}
        </div>
      </div>

      {onApply && (
        <Button type="button" onClick={onApply} className={cn("w-full", compact && "h-8 text-xs")}>
          Szűrők alkalmazása
        </Button>
      )}
    </div>
  )
}
