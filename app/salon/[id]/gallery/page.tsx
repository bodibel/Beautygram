"use client"

import { useState, use } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useSalonData } from "@/hooks/useSalonData"
import { updateSalon } from "@/lib/actions/salon"
import { UploadCloud, Trash2 } from "lucide-react"

export default function SalonGalleryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)

    const {
        salon,
        loading,
        setSalon
    } = useSalonData(id, userData?.id)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return

        setIsUploading(true)
        const newImages: string[] = []

        try {
            // Upload each file
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i]
                const formData = new FormData()
                formData.append("file", file)

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                })

                if (res.ok) {
                    const data = await res.json()
                    newImages.push(data.url)
                }
            }

            // Update salon with new images merged with existing
            if (newImages.length > 0 && salon) {
                const updatedImages = [...(salon.images || []), ...newImages]
                await updateSalon(id, { images: updatedImages })

                // Optimistic update
                setSalon(prev => prev ? { ...prev, images: updatedImages } : null)
            }
        } catch (error) {
            console.error("Gallery upload failed:", error)
            alert("Hiba történt a feltöltés során.")
        } finally {
            setIsUploading(false)
            // Reset input
            e.target.value = ""
        }
    }

    const handleDeleteImage = async (imageUrl: string) => {
        if (!confirm("Biztosan törölni szeretnéd ezt a képet?")) return

        try {
            if (!salon) return
            const updatedImages = (salon.images || []).filter((img: string) => img !== imageUrl)
            await updateSalon(id, { images: updatedImages })
            setSalon(prev => prev ? { ...prev, images: updatedImages } : null)
        } catch (error) {
            console.error("Delete failed:", error)
            alert("Nem sikerült törölni a képet.")
        }
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-7xl p-6 lg:mr-auto">
                    <div className="text-muted-foreground">Betöltés...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon) {
        router.push("/dashboard")
        return null
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full max-w-7xl p-6 md:p-8 lg:mr-auto">
                <h1 className="text-3xl font-bold mb-6">Galéria</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Képek kezelése</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Upload Area */}
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-500"><span className="font-semibold">Kattints a feltöltéshez</span> vagy húzd ide a képeket</p>
                                        <p className="text-xs text-gray-500">PNG, JPG (max 5MB)</p>
                                    </div>
                                    <input
                                        id="dropzone-file"
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>

                            {isUploading && (
                                <div className="text-center text-sm text-muted-foreground animate-pulse">
                                    Képek feltöltése folyamatban...
                                </div>
                            )}

                            {/* Image Grid */}
                            {salon.images && salon.images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {salon.images.map((img: string, index: number) => (
                                        <div key={index} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                            <img
                                                src={img}
                                                alt={`Gallery ${index}`}
                                                className="object-cover w-full h-full"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDeleteImage(img)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    Még nincsenek feltöltött képek a galériában.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
