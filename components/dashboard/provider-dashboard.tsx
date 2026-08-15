"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Store, MapPin, Star, X } from "lucide-react"
import Link from "next/link"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { createSalon, getUserSalons } from "@/lib/actions/salon"
import { getCategories } from "@/lib/actions/category"
import { getDashboardSalonHref } from "@/lib/navigation-config"
import { generateSlug } from "@/lib/slug"

interface Salon {
    id: string
    name: string
    categories: string[]
    currency: string
    address: string
    description: string
    ownerId: string
    rating: number
    reviewCount: number
    createdAt: Date
}

interface Category {
    id: string
    name: string
    slug: string
}


const CURRENCIES = [
    { code: "HUF", symbol: "Ft", name: "Forint" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "USD", symbol: "$", name: "Dollar" },
    { code: "GBP", symbol: "£", name: "Font" },
    { code: "RON", symbol: "lei", name: "Lej" },
]

export function ProviderDashboard() {
    const { userData } = useAuth()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [salonName, setSalonName] = useState("")
    const [salonAddress, setSalonAddress] = useState("")
    const [salonCategories, setSalonCategories] = useState<string[]>([])
    const [salonCurrency, setSalonCurrency] = useState("HUF")
    const [salonDescription, setSalonDescription] = useState("")
    const [salons, setSalons] = useState<Salon[]>([])
    const [loading, setLoading] = useState(true)
    const [allCategories, setAllCategories] = useState<Category[]>([])

    useEffect(() => {
        const loadCategories = async () => {
            const fetched = await getCategories()
            setAllCategories(fetched)
        }
        loadCategories()
    }, [])

    const loadSalons = useCallback(async () => {
        if (!userData?.id) return

        try {
            const loadedSalons = await getUserSalons(userData.id)
            setSalons(loadedSalons as unknown as Salon[])
        } catch (error) {
            console.error("Error loading salons:", error)
        } finally {
            setLoading(false)
        }
    }, [userData?.id])

    useEffect(() => {
        if (userData?.id) {
            loadSalons()
        }
    }, [loadSalons, userData?.id])

    const toggleCategory = (slug: string) => {
        if (salonCategories.includes(slug)) {
            setSalonCategories(salonCategories.filter(c => c !== slug))
        } else {
            setSalonCategories([...salonCategories, slug])
        }
    }

    const handleCreateSalon = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userData?.id) {
            alert("Kérlek jelentkezz be!")
            return
        }

        if (salonCategories.length === 0) {
            alert("Válassz ki legalább egy kategóriát!")
            return
        }

        try {
            const newSalonData = {
                name: salonName,
                categories: salonCategories,
                currency: salonCurrency,
                address: salonAddress,
                city: "Budapest", // Default for now as it's required in schema but not in form
                description: salonDescription,
                ownerId: userData.id,
            }

            const newSalon = await createSalon(newSalonData)

            setSalons([...salons, newSalon as unknown as Salon])

            setIsCreateModalOpen(false)
            setSalonName("")
            setSalonAddress("")
            setSalonCategories([])
            setSalonCurrency("HUF")
            setSalonDescription("")
        } catch (error) {
            console.error("Error creating salon:", error)
            alert("Hiba történt a szalon létrehozása során!")
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Szalonjaim</h1>
                <div className="text-muted-foreground">Betöltés...</div>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Szalonjaim</h1>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Új szalon
                    </Button>
                </div>

                {salons.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Store className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Még nincs szalonod</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                Hozd létre az első szalonod és kezdj el szolgáltatásokat kínálni!
                            </p>
                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Szalon létrehozása
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {salons.map((salon) => (
                            <Link key={salon.id} href={getDashboardSalonHref(salon.id)}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <CardTitle>{salon.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {salon.address}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                                {salon.categories?.map((slug, idx) => {
                                                    const catName = allCategories.find(c => c.slug === slug)?.name || slug
                                                    return (
                                                        <span key={idx} className="text-xs bg-accent text-white px-2 py-1 rounded-md font-medium">
                                                            {catName}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                            {salon.reviewCount > 0 ? (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                    <span className="font-medium">{salon.rating.toFixed(1)}</span>
                                                    <span className="text-muted-foreground">({salon.reviewCount} vélemény)</span>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground">Még nincs értékelés</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Új szalon létrehozása"
            >
                <form onSubmit={handleCreateSalon} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Szalon neve *</label>
                        <Input
                            placeholder="pl. Glamour Szalon"
                            value={salonName}
                            onChange={(e) => setSalonName(e.target.value)}
                            required
                        />
                        {salonName.trim() && (
                          <p className="text-xs text-muted-foreground mt-1">
                            URL: <span className="font-mono text-primary">glowyspot.com/profile/{generateSlug(salonName)}</span>
                          </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Kategóriák * (több is kiválasztható)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {allCategories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => toggleCategory(category.slug)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${salonCategories.includes(category.slug)
                                        ? "bg-primary/10 text-primary border-2 border-primary"
                                        : "bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100"
                                        }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                        {salonCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {salonCategories.map((slug) => {
                                    const catName = allCategories.find(c => c.slug === slug)?.name || slug
                                    return (
                                        <span key={slug} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                                            {catName}
                                            <X
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() => toggleCategory(slug)}
                                            />
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
                            value={salonCurrency}
                            onChange={(e) => setSalonCurrency(e.target.value)}
                            required
                        >
                            {CURRENCIES.map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.name} ({currency.symbol})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Cím *</label>
                        <Input
                            placeholder="Budapest, V. kerület, Petőfi Sándor u. 12."
                            value={salonAddress}
                            onChange={(e) => setSalonAddress(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Rövid leírás</label>
                        <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                            placeholder="Mutatkozz be és írd le a szalonod..."
                            value={salonDescription}
                            onChange={(e) => setSalonDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Mégse
                        </Button>
                        <Button type="submit">
                            Létrehozás
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    )
}
