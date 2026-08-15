"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCategories, updateCategory } from "@/lib/actions/category"
import { CategoryModal } from "./CategoryModal"
import {
    Plus,
    Edit2,
    Eye,
    EyeOff,
    Scissors,
    Sparkles,
    Hand,
    User,
    Palette,
    Waves,
    Smile
} from "lucide-react"
import { toast } from "sonner"

const ICON_MAP: Record<string, React.ElementType> = {
    "Scissors": Scissors,
    "Sparkles": Sparkles,
    "Hand": Hand,
    "User": User,
    "Palette": Palette,
    "Waves": Waves,
    "Smile": Smile,
}

export type AdminCategory = {
    id: string
    name: string
    slug: string
    icon?: string | null
    order: number
    isActive: boolean
}

export function CategoryManager() {
    const [categories, setCategories] = useState<AdminCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null)

    const loadCategories = useCallback(async () => {
        setLoading(true)
        try {
            // Updated getCategories to fetch even inactive ones.
            const data = await getCategories(true)
            setCategories(data)
        } catch (error) {
            console.error("Error loading categories:", error)
            toast.error("Nem sikerült betölteni a kategóriákat.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadCategories()
    }, [loadCategories])

    const handleToggleStatus = async (category: AdminCategory) => {
        try {
            const result = await updateCategory(category.id, { isActive: !category.isActive })
            if (result.success) {
                toast.success(category.isActive ? "Kategória elrejtve" : "Kategória aktiválva")
                loadCategories()
            }
        } catch {
            toast.error("Váratlan hiba történt.")
        }
    }

    const handleEdit = (category: AdminCategory) => {
        setSelectedCategory(category)
        setIsModalOpen(true)
    }

    const handleAdd = () => {
        setSelectedCategory(null)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Kategóriák</h2>
                    <p className="text-sm text-muted-foreground">Kezeld a rendszerben elérhető szolgáltatási kategóriákat.</p>
                </div>
                <Button onClick={handleAdd} className="bg-primary hover:bg-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Új kategória
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Betöltés...</div>
                        ) : categories.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">Nincsenek kategóriák.</div>
                        ) : (
                            categories.map((category) => {
                                const IconComp = ICON_MAP[category.icon || ""] || Sparkles
                                return (
                                    <div key={category.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${category.isActive ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}>
                                                <IconComp className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold flex items-center gap-2">
                                                    {category.name}
                                                    {!category.isActive && (
                                                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase">Inaktív</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Slug: {category.slug} • Rend: {category.order}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleStatus(category)}
                                                title={category.isActive ? "Elrejtés" : "Megjelenítés"}
                                            >
                                                {category.isActive ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-primary" />}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadCategories}
                category={selectedCategory}
            />
        </div>
    )
}
