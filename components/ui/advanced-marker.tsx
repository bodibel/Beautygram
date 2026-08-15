"use client"

import { useEffect, useRef, useState } from "react"
import { useGoogleMap } from "@react-google-maps/api"

interface AdvancedMarkerProps {
    position: google.maps.LatLngLiteral
    draggable?: boolean
    onDragEnd?: (e: google.maps.MapMouseEvent) => void
}

export function AdvancedMarker({ position, draggable, onDragEnd }: AdvancedMarkerProps) {
    const map = useGoogleMap()
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const [markerLibReady, setMarkerLibReady] = useState(false)

    useEffect(() => {
        google.maps.importLibrary("marker").then(() => {
            setMarkerLibReady(true)
        })
    }, [])

    useEffect(() => {
        if (!map || !markerLibReady) return

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            gmpDraggable: draggable ?? false,
        })

        if (onDragEnd) {
            marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
                onDragEnd(e)
            })
        }

        markerRef.current = marker

        return () => {
            marker.map = null
            markerRef.current = null
        }
    }, [draggable, map, markerLibReady, onDragEnd, position])

    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.position = position
        }
    }, [position])

    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.gmpDraggable = draggable ?? false
        }
    }, [draggable])

    return null
}
