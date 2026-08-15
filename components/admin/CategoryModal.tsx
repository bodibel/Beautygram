"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Scissors,
    Sparkles,
    Hand,
    User,
    Palette,
    Waves,
    Smile,
} from "lucide-react"
import { toast } from "sonner"
import { createCategory, updateCategory } from "@/lib/actions/category"
import type { AdminCategory } from "./CategoryManager"

const AVAILABLE_ICONS = [
    { name: "Scissors", icon: Scissors },
    { name: "Sparkles", icon: Sparkles },
    { name: "Hand", icon: Hand },
    { name: "User", icon: User },
    { name: "Palette", icon: Palette },
    { name: "Waves", icon: Waves },
    { name: "Smile", icon: Smile },
]

interface CategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    category?: AdminCategory | null
}

export function CategoryModal({ isOpen, onClose, onSuccess, category }: CategoryModalProps) {
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [icon, setIcon] = useState("Scissors")
    const [order, setOrder] = useState(0)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (category) {
            setName(category.name)
            setSlug(category.slug)
            setIcon(category.icon || "Scissors")
            setOrder(category.order || 0)
        } else {
            setName("")
            setSlug("")
            setIcon("Scissors")
            setOrder(0)
        }
    }, [category, isOpen])

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setName(value)
        if (!category) {
            setSlug(value.toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, ''))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = { name, slug, icon, order: Number(order) }
            let result

            if (category) {
                result = await updateCategory(category.id, data)
            } else {
                result = await createCategory(data)
            }

            if (result.success) {
                toast.success(category ? "Kategória frissítve!" : "Kategória létrehozva!")
                onSuccess()
                onClose()
            } else {
                toast.error(result.error || "Hiba történt.")
            }
        } catch (error) {
            console.error("Error saving category:", error)
            toast.error("Váratlan hiba történt.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{category ? "Kategória szerkesztése" : "Új kategória"}</DialogTitle>
                    <DialogDescription>
                        Add meg a kategória adatait. A slug automatikusan generálódik.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Megnevezés (HU) *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Pl. Fodrászat"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="slug">Slug *</Label>
                        <Input
                            id="slug"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="Pl. hair"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Ikon választása</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {AVAILABLE_ICONS.map((item) => {
                                const IconComp = item.icon
                                return (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => setIcon(item.name)}
                                        className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${icon === item.name
                                                ? "border-primary bg-accent text-primary"
                                                : "border-gray-100 hover:border-gray-200 text-gray-400"
                                            }`}
                                    >
                                        <IconComp className="h-6 w-6" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="order">Sorrend</Label>
                        <Input
                            id="order"
                            type="number"
                            value={order}
                            onChange={(e) => setOrder(Number(e.target.value))}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Mégse</Button>
                        <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary">
                            {loading ? "Mentés..." : "Mentés"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
