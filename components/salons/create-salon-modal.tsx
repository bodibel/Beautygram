"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { generateSlug } from "@/lib/slug"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImagePlus, X, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { createSalon } from "@/lib/actions/salon"
import { useRouter } from "next/navigation"
import { SafetyWarningModal } from "@/components/ui/SafetyWarningModal"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { uploadFile } from "@/lib/upload"

interface CreateSalonModalProps {
    isOpen: boolean
    onClose: () => void
}

export function CreateSalonModal({ isOpen, onClose }: CreateSalonModalProps) {
    const router = useRouter()
    const [name, setName] = useState("")
    const [address, setAddress] = useState("")
    const [currency, setCurrency] = useState("HUF")
    const [categories, setCategories] = useState<string[]>([])
    const [profileImage, setProfileImage] = useState<File | null>(null)
    const [profilePreview, setProfilePreview] = useState<string | null>(null)
    const [coverImage, setCoverImage] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [safetyError, setSafetyError] = useState<{ message: string; preview: string | null } | null>(null)

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setProfileImage(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setProfilePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setCoverImage(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setCoverPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !address) return

        try {
            setIsLoading(true)

            let profileImageUrl = null
            let coverImageUrl = null

            if (profileImage) {
                try {
                    profileImageUrl = await uploadFile(profileImage)
                } catch (error: any) {
                    setSafetyError({ message: error.message, preview: profilePreview })
                    toast.error(error.message, {
                        duration: 5000,
                        position: "top-center"
                    })
                    return
                }
            }
            if (coverImage) {
                try {
                    coverImageUrl = await uploadFile(coverImage)
                } catch (error: any) {
                    setSafetyError({ message: error.message, preview: coverPreview })
                    toast.error(error.message, {
                        duration: 5000,
                        position: "top-center"
                    })
                    return
                }
            }

            await createSalon({
                name,
                address,
                currency,
                categoryIds: categories,
                image: profileImageUrl,
                coverImage: coverImageUrl
            })

            toast.success("Szalon sikeresen létrehozva!")
            onClose()
            router.refresh()
        } catch (error) {
            console.error("Failed to create salon:", error)
            toast.error("Hiba történt a szalon létrehozása során")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] bg-white text-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-primary">Új szalon létrehozása</DialogTitle>
                        <DialogDescription>
                            Add meg a szalonod alapvető adatait a kezdéshez.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Szalon neve</Label>
                                    <Input
                                        id="name"
                                        placeholder="Pl. Golden Beauty"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="rounded-xl border-gray-200"
                                        required
                                    />
                                    {name.trim() && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        URL: <span className="font-mono text-primary">glowyspot.com/profile/{generateSlug(name)}</span>
                                      </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Cím</Label>
                                    <AddressAutocomplete
                                        onAddressSelect={(val) => setAddress(val.address)}
                                        defaultValue={address}
                                        placeholder="Szalon címe..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Pénznem</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="rounded-xl border-gray-200">
                                            <SelectValue placeholder="Pénznem" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HUF">HUF (Ft)</SelectItem>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Profilkép</Label>
                                    <div className="flex items-center justify-center">
                                        {profilePreview ? (
                                            <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-primary/10 group">
                                                <img src={profilePreview} alt="Profile" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setProfileImage(null); setProfilePreview(null) }}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-6 w-6 text-white" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="h-32 w-32 rounded-full border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-primary-subtle transition-all">
                                                <ImagePlus className="h-8 w-8 text-gray-400" />
                                                <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Feltöltés</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleProfileChange} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Borítókép</Label>
                                    <div className="flex items-center justify-center">
                                        {coverPreview ? (
                                            <div className="relative h-24 w-full rounded-xl overflow-hidden border-2 border-primary/10 group">
                                                <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setCoverImage(null); setCoverPreview(null) }}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-6 w-6 text-white" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="h-24 w-full rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-primary-subtle transition-all">
                                                <ImagePlus className="h-6 w-6 text-gray-400" />
                                                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Borítókép feltöltése</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-3">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl">
                                Mégse
                            </Button>
                            <Button type="submit" disabled={isLoading} className="rounded-xl bg-primary hover:bg-primary text-white min-w-[120px]">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Létrehozás"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <SafetyWarningModal
                isOpen={!!safetyError}
                onClose={() => setSafetyError(null)}
                message={safetyError?.message || ""}
                imagePreview={safetyError?.preview}
            />
        </>
    )
}
