"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { GoogleMap, useLoadScript } from "@react-google-maps/api"
import { AdvancedMarker } from "@/components/ui/advanced-marker"
import usePlacesAutocompleteNew from "@/lib/hooks/usePlacesAutocompleteNew"
import { getGeocode, getLatLng } from "use-places-autocomplete"
import { Check, ChevronsUpDown, MapPin, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { EU_COUNTRIES } from "@/lib/constants"

interface EnhancedAddressPickerProps {
    onAddressChange: (data: {
        country: string
        city: string
        district?: string
        street: string
        houseNumber: string
        floor?: string
        door?: string
        zipCode?: string
        lat: number
        lng: number
        fullAddress: string
    }) => void
    initialData?: {
        country?: string
        city?: string
        district?: string
        street?: string
        houseNumber?: string
        floor?: string
        door?: string
        zipCode?: string
        lat?: number
        lng?: number
    }
}

const mapContainerStyle = {
    width: "100%",
    height: "250px",
    borderRadius: "0.75rem",
}

const defaultCenter = {
    lat: 47.497913,
    lng: 19.040236, // Budapest
}
const MAP_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

type AddressOverrides = {
    lat?: number
    lng?: number
    zip?: string
    dist?: string
}

export function EnhancedAddressPicker({ onAddressChange, initialData }: EnhancedAddressPickerProps) {
    // Selection state
    const [country, setCountry] = useState(initialData?.country || "Magyarország")
    const [city, setCity] = useState(initialData?.city || "")
    const [district, setDistrict] = useState(initialData?.district || "")
    const [street, setStreet] = useState(initialData?.street || "")
    const [houseNumber, setHouseNumber] = useState(initialData?.houseNumber || "")
    const [floor, setFloor] = useState(initialData?.floor || "")
    const [door, setDoor] = useState(initialData?.door || "")
    const [zipCode, setZipCode] = useState(initialData?.zipCode || "")
    const [coords, setCoords] = useState({
        lat: initialData?.lat || defaultCenter.lat,
        lng: initialData?.lng || defaultCenter.lng
    })

    // UI state
    const [countryOpen, setCountryOpen] = useState(false)
    const [cityOpen, setCityOpen] = useState(false)
    const [streetOpen, setStreetOpen] = useState(false)

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: MAP_LIBRARIES,
    })

    // Google Places for City
    const {
        value: citySearchValue,
        suggestions: { status: cityStatus, data: cityData },
        setValue: setCitySearchValue,
        clearSuggestions: clearCitySuggestions,
    } = usePlacesAutocompleteNew({
        requestOptions: {
            componentRestrictions: { country: EU_COUNTRIES.find(c => c.name === country)?.code.toLowerCase() || "hu" },
            types: ["locality"],
        },
        debounce: 300,
        defaultValue: initialData?.city || "",
        initOnMount: isLoaded,
    })
    // Google Places for Street - with city prefix for accurate results
    const {
        suggestions: { status: streetStatus, data: streetData },
        setValue: setStreetSearchValue,
        clearSuggestions: clearStreetSuggestions,
    } = usePlacesAutocompleteNew({
        requestOptions: {
            componentRestrictions: { country: EU_COUNTRIES.find(c => c.name === country)?.code.toLowerCase() || "hu" },
            types: ["route"],
        },
        debounce: 300,
        defaultValue: initialData?.street ? `${initialData.city}, ${initialData.street}` : "",
        initOnMount: isLoaded,
    })

    // State for what the user actually types (without city prefix)
    const [streetDisplayValue, setStreetDisplayValue] = useState(initialData?.street || "")

    // Use a ref to track if we've already initialized for the current salon
    const initializedRef = useRef(false);

    // Sync with initialData - only do this when initialData actually has content 
    // and we haven't initialized yet
    useEffect(() => {
        if (initialData && (initialData.city || initialData.lat) && !initializedRef.current) {
            const timer = window.setTimeout(() => {
            setCountry(initialData.country || "Magyarország");
            setCity(initialData.city || "");
            setCitySearchValue(initialData.city || "", false);
            setDistrict(initialData.district || "");
            setStreet(initialData.street || "");
            setStreetDisplayValue(initialData.street || "");
            setStreetSearchValue(initialData.street ? `${initialData.city}, ${initialData.street}` : "", false);
            setHouseNumber(initialData.houseNumber || "");
            setFloor(initialData.floor || "");
            setDoor(initialData.door || "");
            setZipCode(initialData.zipCode || "");
            if (initialData.lat && initialData.lng) {
                setCoords({ lat: initialData.lat, lng: initialData.lng });
            }
            initializedRef.current = true;
            }, 0)
            return () => window.clearTimeout(timer)
        }
    }, [initialData, setCitySearchValue, setStreetSearchValue]);

    // Reset initialization when initialData changes to a different location (optional)
    useEffect(() => {
        if (!initialData?.city && !initialData?.lat) {
            initializedRef.current = false;
        }
    }, [initialData?.city, initialData?.lat]);

    // Custom handler: prepend city name invisibly to the search query
    const handleStreetSearchChange = (userInput: string) => {
        setStreetDisplayValue(userInput)
        // Send city + user input to Google Places for accurate results
        if (city && userInput) {
            setStreetSearchValue(`${city}, ${userInput}`)
        } else {
            setStreetSearchValue(userInput)
        }
    }

    // Update coordinates when city/street changes via manual selection
    const updateLocation = async (address: string) => {
        try {
            const results = await getGeocode({ address })
            const { lat, lng } = await getLatLng(results[0])
            setCoords({ lat, lng })

            // Extract components
            const components = results[0].address_components
            let foundZip = ""
            let foundDistrict = ""

            components.forEach(c => {
                if (c.types.includes("postal_code")) foundZip = c.long_name
                if (c.types.includes("sublocality_level_1")) foundDistrict = c.long_name
            })

            if (foundZip) setZipCode(foundZip)
            if (foundDistrict) setDistrict(foundDistrict)

            notifyChange({
                lat,
                lng,
                zip: foundZip || zipCode,
                dist: foundDistrict || district
            })
        } catch (error) {
            console.error("Error updating location:", error)
        }
    }

    const notifyChange = useCallback((overrides: AddressOverrides = {}) => {
        const fullAddr = `${street} ${houseNumber}${floor ? `, ${floor}. em.` : ""}${door ? ` ${door}. ajtó` : ""}, ${city}, ${country}`.trim()
        onAddressChange({
            country,
            city,
            district: overrides.dist || district,
            street,
            houseNumber,
            floor,
            door,
            zipCode: overrides.zip || zipCode,
            lat: overrides.lat || coords.lat,
            lng: overrides.lng || coords.lng,
            fullAddress: fullAddr
        })
    }, [city, coords.lat, coords.lng, country, district, door, floor, houseNumber, onAddressChange, street, zipCode])

    const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLat = e.latLng.lat()
            const newLng = e.latLng.lng()
            setCoords({ lat: newLat, lng: newLng })
            notifyChange({ lat: newLat, lng: newLng })
        }
    }

    // Effect to notify change on any field update
    useEffect(() => {
        notifyChange()
    }, [country, city, district, street, houseNumber, floor, door, zipCode, notifyChange])

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Step 1: Country */}
                <div className="space-y-2">
                    <Label>1. Ország (EU)</Label>
                    <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                            >
                                {country || "Válassz országot..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Ország keresése..." />
                                <CommandList>
                                    <CommandEmpty>Nincs találat.</CommandEmpty>
                                    <CommandGroup>
                                        {EU_COUNTRIES.map((c) => (
                                            <CommandItem
                                                key={c.code}
                                                onSelect={() => {
                                                    setCountry(c.name)
                                                    setCountryOpen(false)
                                                    setCity("")
                                                    setStreet("")
                                                    setHouseNumber("")
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", country === c.name ? "opacity-100" : "opacity-0")} />
                                                {c.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Step 2: City */}
                <div className="space-y-2">
                    <Label className={cn(!country && "opacity-50")}>2. Település</Label>
                    <Popover open={cityOpen} onOpenChange={setCityOpen}>
                        <PopoverTrigger asChild disabled={!country}>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                            >
                                {city || "Város keresése..."}
                                <MapPin className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Város neve..."
                                    value={citySearchValue}
                                    onValueChange={setCitySearchValue}
                                />
                                <CommandList>
                                    {cityStatus === "OK" && cityData.map((suggestion) => {
                                        const { place_id, description, structured_formatting } = suggestion
                                        const cityName = structured_formatting?.main_text || description.split(",")[0]
                                        return (
                                            <CommandItem
                                                key={place_id}
                                                onSelect={() => {
                                                    setCity(cityName)
                                                    setCityOpen(false)
                                                    setStreet("")
                                                    setStreetDisplayValue("")
                                                    setHouseNumber("")
                                                    clearCitySuggestions()
                                                    updateLocation(description)
                                                }}
                                            >
                                                {cityName}
                                            </CommandItem>
                                        )
                                    })}
                                    {cityStatus === "ZERO_RESULTS" && <CommandEmpty>Nincs találat.</CommandEmpty>}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {/* Step 3: Street */}
                <div className="space-y-2">
                    <Label className={cn(!city && "opacity-50")}>3. Utca</Label>
                    <Popover open={streetOpen} onOpenChange={setStreetOpen}>
                        <PopoverTrigger asChild disabled={!city}>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                            >
                                {street || "Utca keresése..."}
                                <Navigation className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Utca neve..."
                                    value={streetDisplayValue}
                                    onValueChange={handleStreetSearchChange}
                                />
                                <CommandList>
                                    {streetStatus === "OK" && streetData.map((suggestion) => {
                                        const { place_id, description, structured_formatting } = suggestion
                                        // Extract the street name using main_text or fallback
                                        const streetNameOnly = structured_formatting?.main_text || description.split(",")[0]
                                        return (
                                            <CommandItem
                                                key={place_id}
                                                onSelect={() => {
                                                    setStreet(streetNameOnly)
                                                    setStreetDisplayValue("")
                                                    setStreetOpen(false)
                                                    clearStreetSuggestions()
                                                    updateLocation(description)
                                                }}
                                            >
                                                {streetNameOnly}
                                            </CommandItem>
                                        )
                                    })}
                                    {streetStatus === "ZERO_RESULTS" && <CommandEmpty>Nincs találat.</CommandEmpty>}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Step 4: House Number */}
                <div className="space-y-2">
                    <Label className={cn(!street && "opacity-50")}>4. Házszám</Label>
                    <Input
                        placeholder="Házszám (pl. 14/B)"
                        value={houseNumber}
                        onChange={(e) => setHouseNumber(e.target.value)}
                        disabled={!street}
                    />
                </div>
            </div>

            {/* Additional Details */}
            <div className="grid gap-4 grid-cols-3">
                <div className="space-y-2">
                    <Label className={cn(!houseNumber && "opacity-50")}>Emelet</Label>
                    <Input
                        placeholder="pl. 2"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        disabled={!houseNumber}
                    />
                </div>
                <div className="space-y-2">
                    <Label className={cn(!houseNumber && "opacity-50")}>Ajtó</Label>
                    <Input
                        placeholder="pl. 201"
                        value={door}
                        onChange={(e) => setDoor(e.target.value)}
                        disabled={!houseNumber}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Irányítószám</Label>
                    <Input
                        placeholder="Automatikus"
                        value={zipCode}
                        readOnly
                        disabled
                        className="bg-muted/50"
                    />
                </div>
            </div>

            {/* Map Preview */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    Térképes pontosítás
                    <span className="text-[10px] font-normal text-muted-foreground">(Húzd a jelölőt a pontos helyre!)</span>
                </Label>
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={coords}
                        zoom={15}
                        options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                            styles: [
                                {
                                    featureType: "poi",
                                    elementType: "labels",
                                    stylers: [{ visibility: "off" }]
                                }
                            ]
                        }}
                    >
                        <AdvancedMarker
                            position={coords}
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                        />
                    </GoogleMap>
                </div>
            </div>
        </div>
    )
}
