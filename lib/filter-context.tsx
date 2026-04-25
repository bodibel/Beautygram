"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

export interface LocationState {
    city: string
    country: string
    radius: number
    lat?: number
    lng?: number
}

export interface FilterState {
    services: string[]
    rating: number | null
    openNow: boolean
    availableToday: boolean
    searchQuery: string
}

interface FilterContextType {
    location: LocationState
    filters: FilterState
    isFilterModalOpen: boolean
    toggleFilterModal: (isOpen?: boolean) => void
    updateLocation: (location: Partial<LocationState>) => void
    updateFilters: (filters: Partial<FilterState>) => void
    addServiceFilter: (service: string) => void
    removeServiceFilter: (service: string) => void
    updateSearchQuery: (query: string) => void
    clearFilters: () => void
    resetFiltersAndLocation: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

const defaultLocation: LocationState = {
    city: "Budapest",
    country: "Magyarország",
    radius: 10,
}

const defaultFilters: FilterState = {
    services: [],
    rating: null,
    openNow: false,
    availableToday: false,
    searchQuery: "",
}

export function FilterProvider({ children }: { children: ReactNode }) {
    const [location, setLocation] = useState<LocationState>(defaultLocation)
    const [filters, setFilters] = useState<FilterState>(defaultFilters)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

    const toggleFilterModal = (isOpen?: boolean) => {
        setIsFilterModalOpen((prev) => (isOpen !== undefined ? isOpen : !prev))
    }

    const updateLocation = (newLocation: Partial<LocationState>) => {
        setLocation((prev) => ({ ...prev, ...newLocation }))
    }

    const updateFilters = (newFilters: Partial<FilterState>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }))
    }

    const addServiceFilter = (service: string) => {
        setFilters((prev) => {
            if (prev.services.includes(service)) return prev
            return { ...prev, services: [...prev.services, service] }
        })
    }

    const removeServiceFilter = (service: string) => {
        setFilters((prev) => ({
            ...prev,
            services: prev.services.filter((s) => s !== service),
        }))
    }

    const updateSearchQuery = (query: string) => {
        setFilters((prev) => ({ ...prev, searchQuery: query }))
    }

    const clearFilters = () => {
        setFilters(defaultFilters)
    }

    const resetFiltersAndLocation = () => {
        setFilters(defaultFilters)
        setLocation(defaultLocation)
    }

    return (
        <FilterContext.Provider
            value={{
                location,
                filters,
                isFilterModalOpen,
                toggleFilterModal,
                updateLocation,
                updateFilters,
                addServiceFilter,
                removeServiceFilter,
                updateSearchQuery,
                clearFilters,
                resetFiltersAndLocation,
            }}
        >
            {children}
        </FilterContext.Provider>
    )
}

export function useFilter() {
    const context = useContext(FilterContext)
    if (context === undefined) {
        throw new Error("useFilter must be used within a FilterProvider")
    }
    return context
}
