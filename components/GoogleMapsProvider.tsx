"use client"

import { useLoadScript } from "@react-google-maps/api"
import { ReactNode } from "react"

const MAP_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
    const { loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: MAP_LIBRARIES,
    })

    if (loadError) {
        console.error("Error loading Google Maps script:", loadError)
    }

    // We don't block rendering here because some pages might not need maps immediately,
    // but the script will be available globally once loaded.
    return <>{children}</>
}
