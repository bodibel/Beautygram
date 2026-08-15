"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { useState, useEffect } from "react"
import { Salon, CURRENCIES } from "@/lib/salon-types"
import { getCategories } from "@/lib/actions/category"
import { EnhancedAddressPicker } from "@/components/ui/enhanced-address-picker"
import { useLoadScript } from "@react-google-maps/api"

const MAP_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

type CategoryOption = {
    id: string
    name: string
    slug: string
}

type AddressFormData = {
    fullAddress: string
    city: string
    district?: string
    street?: string
    houseNumber?: string
    zipCode?: string
    country?: string
    lat?: number
    lng?: number
    floor?: string
    door?: string
}

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (settings: Partial<Salon>) => void
    salon: Salon | null
}

export function SettingsModal({ isOpen, onClose, onSave, salon }: SettingsModalProps) {
    const [name, setName] = useState(salon?.name || "")
    const [address, setAddress] = useState(salon?.address || "")
    const [city, setCity] = useState(salon?.city || "")
    const [district, setDistrict] = useState(salon?.district || "")
    const [street, setStreet] = useState(salon?.street || "")
    const [houseNumber, setHouseNumber] = useState(salon?.houseNumber || "")
    const [zipCode, setZipCode] = useState(salon?.zipCode || "")
    const [country, setCountry] = useState(salon?.country || "Magyarország")
    const [lat, setLat] = useState<number | undefined>(salon?.lat || undefined)
    const [lng, setLng] = useState<number | undefined>(salon?.lng || undefined)
    const [floor, setFloor] = useState(salon?.floor || "")
    const [door, setDoor] = useState(salon?.door || "")
    const [categories, setCategories] = useState<string[]>(salon?.categories || [])
    const [currency, setCurrency] = useState(salon?.currency || "HUF")
    const [description, setDescription] = useState(salon?.description || "")
    const [allCategories, setAllCategories] = useState<CategoryOption[]>([])

    useEffect(() => {
        const loadCategories = async () => {
            const fetched = await getCategories()
            setAllCategories(fetched)
        }
        loadCategories()
    }, [])

    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    useLoadScript({
        googleMapsApiKey: googleMapsKey || "",
        libraries: MAP_LIBRARIES,
    })

    useEffect(() => {
        if (salon && isOpen) {
            const timer = window.setTimeout(() => {
                setName(salon.name || "")
                setAddress(salon.address || "")
                setCity(salon.city || "")
                setDistrict(salon.district || "")
                setStreet(salon.street || "")
                setHouseNumber(salon.houseNumber || "")
                setZipCode(salon.zipCode || "")
                setCountry(salon.country || "")
                setLat(salon.lat)
                setLng(salon.lng)
                setFloor(salon.floor || "")
                setDoor(salon.door || "")
                setCategories(salon.categories || [])
                setCurrency(salon.currency || "HUF")
                setDescription(salon.description || "")
            }, 0)
            return () => window.clearTimeout(timer)
        }
    }, [salon, isOpen])

    const toggleCategory = (category: string) => {
        if (categories.includes(category)) {
            setCategories(categories.filter(c => c !== category))
        } else {
            setCategories([...categories, category])
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (categories.length === 0) {
            alert("Válassz ki legalább egy kategóriát!")
            return
        }
        onSave({
            name,
            address,
            city,
            district,
            street,
            houseNumber,
            zipCode,
            country,
            lat,
            lng,
            floor,
            door,
            categories,
            currency,
            description
        })
    }

    const handleAddressChange = (data: AddressFormData) => {
        setAddress(data.fullAddress)
        setCity(data.city)
        setDistrict(data.district || "")
        setStreet(data.street || "")
        setHouseNumber(data.houseNumber || "")
        setZipCode(data.zipCode || "")
        setCountry(data.country || "")
        setLat(data.lat)
        setLng(data.lng)
        setFloor(data.floor || "")
        setDoor(data.door || "")
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Alapadatok szerkesztése"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Szalon neve *</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Kategóriák * (több is kiválasztható)</label>
                    <div className="grid grid-cols-2 gap-2">
                        {allCategories.map((category) => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => toggleCategory(category.slug)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${categories.includes(category.slug)
                                    ? "bg-primary/10 text-primary border-2 border-primary"
                                    : "bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100"
                                    }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                    {categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {categories.map((slug) => {
                                const catName = allCategories.find(c => c.slug === slug)?.name || slug
                                return (
                                    <span key={slug} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                                        {catName}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleCategory(slug)} />
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Pénznem *</label>
                    <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        required
                    >
                        {CURRENCIES.map((curr) => (
                            <option key={curr.code} value={curr.code}>
                                {curr.name} ({curr.symbol})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {googleMapsKey ? (
                        <EnhancedAddressPicker
                            onAddressChange={handleAddressChange}
                            initialData={{
                                country,
                                city,
                                district,
                                street,
                                houseNumber,
                                zipCode,
                                lat,
                                lng,
                                floor,
                                door
                            }}
                        />
                    ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed">
                            <p className="font-bold mb-1">Google Maps API kulcs hiányzik!</p>
                            <p>A címkeresés funkció használatához be kell állítani a `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` változót az `.env` fájlban.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Rövid leírás</label>
                    <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                    <Button variant="outline" type="button" onClick={onClose}>
                        Mégse
                    </Button>
                    <Button type="submit">
                        Mentés
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
