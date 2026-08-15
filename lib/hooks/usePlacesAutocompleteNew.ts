"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UsePlacesAutocompleteNewProps {
    requestOptions?: {
        componentRestrictions?: { country: string | string[] };
        types?: string[];
    };
    debounce?: number;
    defaultValue?: string;
    initOnMount?: boolean;
}

type LegacyAutocompletePrediction = {
    description: string
    place_id: string
    structured_formatting: {
        main_text: string
        secondary_text: string
    }
}

type AutocompleteRequest = {
    input: string
    sessionToken: google.maps.places.AutocompleteSessionToken | null
    includedRegionCodes?: string[]
    includedPrimaryTypes?: string[]
}

type PlacePrediction = {
    text?: { text?: string }
    structuredFormat?: {
        mainText?: { text?: string }
        secondaryText?: { text?: string }
    }
    mainText?: { text?: string }
    secondaryText?: { text?: string }
    placeId?: string
}

type AutocompleteSuggestionResult = {
    placePrediction?: PlacePrediction
}

type PlacesAutocompleteApi = typeof google.maps.places & {
    AutocompleteSuggestion?: {
        fetchAutocompleteSuggestions: (request: AutocompleteRequest) => Promise<{
            suggestions: AutocompleteSuggestionResult[]
        }>
    }
}

export default function usePlacesAutocompleteNew({
    requestOptions,
    debounce = 300,
    defaultValue = "",
    initOnMount = true
}: UsePlacesAutocompleteNewProps = {}) {
    const [ready, setReady] = useState(false)
    const [value, setValue] = useState(defaultValue)
    const [suggestions, setSuggestions] = useState<{ status: string; data: LegacyAutocompletePrediction[] }>({
        status: "",
        data: []
    })

    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

    useEffect(() => {
        if (typeof window !== "undefined" && window.google && window.google.maps && window.google.maps.places && initOnMount) {
            const timer = window.setTimeout(() => {
                setReady(true)
                if (!sessionTokenRef.current) {
                    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
                }
            }, 0)
            return () => window.clearTimeout(timer)
        }
    }, [initOnMount])

    const fetchSuggestions = useCallback(async (val: string) => {
        if (!val || !window.google?.maps?.places) {
            setSuggestions({ status: "", data: [] })
            return
        }

        try {
            const { AutocompleteSuggestion } = window.google.maps.places as PlacesAutocompleteApi
            if (!AutocompleteSuggestion) {
                // Fallback or early exit if New API is not yet available in the loaded script
                setSuggestions({ status: "ERROR", data: [] })
                return
            }

            // Build request for the new Places API
            // Translate componentRestrictions to includedRegionCodes
            const { componentRestrictions, types } = requestOptions || {}

            const request: AutocompleteRequest = {
                input: val,
                sessionToken: sessionTokenRef.current,
            }

            // Convert componentRestrictions.country to includedRegionCodes
            if (componentRestrictions?.country) {
                const country = componentRestrictions.country
                if (Array.isArray(country)) {
                    request.includedRegionCodes = country.map((c: string) => c.toUpperCase())
                } else {
                    request.includedRegionCodes = [country.toUpperCase()]
                }
            }

            // Add types if provided
            if (types && types.length > 0) {
                request.includedPrimaryTypes = types
            }

            const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

            // Transform new API format to legacy format for backwards compatibility
            // New API: { text: { text: "City Name" }, placeId: "..." }
            // Legacy format expected by UI: { description: "City Name", place_id: "..." }
            const transformedData = response.suggestions.map((s) => {
                const prediction = s.placePrediction
                return {
                    description: prediction?.text?.text || prediction?.structuredFormat?.mainText?.text || prediction?.mainText?.text || "",
                    place_id: prediction?.placeId || "",
                    // Keep original data for reference
                    structured_formatting: {
                        main_text: prediction?.structuredFormat?.mainText?.text || prediction?.mainText?.text || "",
                        secondary_text: prediction?.structuredFormat?.secondaryText?.text || prediction?.secondaryText?.text || ""
                    }
                }
            })

            setSuggestions({
                status: transformedData.length > 0 ? "OK" : "ZERO_RESULTS",
                data: transformedData
            })
        } catch (error) {
            console.error("Error fetching suggestions:", error)
            setSuggestions({ status: "ERROR", data: [] })
        }
    }, [requestOptions])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (value && value !== defaultValue) {
                fetchSuggestions(value)
            }
        }, debounce)

        return () => clearTimeout(timer)
    }, [value, debounce, fetchSuggestions, defaultValue])

    const clearSuggestions = useCallback(() => {
        setSuggestions({ status: "", data: [] })
    }, [])

    const handleSetValue = useCallback((val: string, shouldFetch = true) => {
        setValue(val)
        if (!shouldFetch) {
            clearSuggestions()
        }
    }, [clearSuggestions])

    return {
        ready,
        value,
        suggestions,
        setValue: handleSetValue,
        clearSuggestions,
    }
}
