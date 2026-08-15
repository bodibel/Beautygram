"use client"

import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from "use-places-autocomplete"
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown, MapPin } from "lucide-react"
import { useState, useEffect } from "react"

interface AddressAutocompleteProps {
    onAddressSelect: (address: {
        address: string
        city: string
        district?: string
        street?: string
        houseNumber?: string
        zipCode?: string
        country?: string
        lat: number
        lng: number
    }) => void
    defaultValue?: string
    placeholder?: string
}

export function AddressAutocomplete({ onAddressSelect, defaultValue = "", placeholder = "Cím keresése..." }: AddressAutocompleteProps) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState(defaultValue)

    const {
        ready,
        value: searchValue,
        suggestions: { status, data },
        setValue: setSearchValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: "hu" }, // Restrict to Hungary
        },
        debounce: 300,
        initOnMount: true,
    })

    // Initialize when ready (script loaded)
    useEffect(() => {
        if (open && !ready) {
            // This assumes the script is loaded by the parent or layout
            // If not, usePlacesAutocomplete handles it if we pass initOnMount: true
            // But we want to control it.
            // For now, let's just rely on the hook.
        }
    }, [open, ready])

    const handleSelect = async (address: string) => {
        setValue(address)
        setSearchValue(address, false)
        clearSuggestions()
        setOpen(false)

        try {
            const results = await getGeocode({ address })
            const { lat, lng } = await getLatLng(results[0])

            // Extract City and Address
            const addressComponents = results[0].address_components
            let city = ""
            let district = ""
            let street = ""
            let streetNumber = ""
            let zipCode = ""
            let country = ""

            addressComponents.forEach(component => {
                if (component.types.includes("locality")) {
                    city = component.long_name
                }
                if (component.types.includes("sublocality_level_1")) {
                    district = component.long_name
                }
                if (component.types.includes("route")) {
                    street = component.long_name
                }
                if (component.types.includes("street_number")) {
                    streetNumber = component.long_name
                }
                if (component.types.includes("postal_code")) {
                    zipCode = component.long_name
                }
                if (component.types.includes("country")) {
                    country = component.long_name
                }
            })

            // Fallback for district/sublocality if missing
            if (!district) {
                addressComponents.forEach(component => {
                    if (component.types.includes("neighborhood")) {
                        district = component.long_name
                    }
                })
            }

            // Fallback for city if locality is missing (e.g. Budapest districts)
            if (!city) {
                addressComponents.forEach(component => {
                    if (component.types.includes("administrative_area_level_1")) {
                        city = component.long_name
                    }
                })
            }

            onAddressSelect({
                address,
                city: city,
                district: district,
                street: street,
                houseNumber: streetNumber,
                zipCode: zipCode,
                country: country,
                lat,
                lng
            })
        } catch (error) {
            console.error("Error: ", error)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value ? value : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}> {/* Disable internal filtering, use Google's */}
                    <CommandInput
                        placeholder="Kezdd el gépelni a címet..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        disabled={!ready}
                    />
                    <CommandList>
                        {status === "OK" && data.map(({ place_id, description }) => (
                            <CommandItem
                                key={place_id}
                                value={description}
                                onSelect={handleSelect}
                            >
                                <MapPin className="mr-2 h-4 w-4" />
                                {description}
                            </CommandItem>
                        ))}
                        {status === "ZERO_RESULTS" && (
                            <CommandEmpty>Nincs találat.</CommandEmpty>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
