"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ImagePlus, X, Loader2, LayoutGrid, Layout, Columns, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { SafetyWarningModal } from "@/components/ui/SafetyWarningModal"
import { toast } from "sonner"
import { uploadFile } from "@/lib/upload"
import Image from "next/image"

interface PostModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (content: string, imageUrls: string[], layout: string) => void
    initialContent?: string
    initialImages?: string[]
    initialLayout?: string
    isEditing?: boolean
}

type LayoutType = "grid" | "carousel" | "collage" | "columns"

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Hiba a képek feltöltésekor!"
}

export function PostModal({
    isOpen,
    onClose,
    onSave,
    initialContent = "",
    initialImages = [],
    initialLayout = "grid",
    isEditing = false
}: PostModalProps) {
    const [content, setContent] = useState(initialContent || "")
    const [files, setFiles] = useState<{ file: File | null; preview: string }[]>([])
    const [layout, setLayout] = useState<LayoutType>(initialLayout as LayoutType)
    const [isUploading, setIsUploading] = useState(false)
    const [safetyError, setSafetyError] = useState<{ message: string; preview: string | null } | null>(null)

    useEffect(() => {
        if (isOpen) {
            // Only set initial state when the modal is opened
            setContent(initialContent || "")
            setLayout((initialLayout || "grid") as LayoutType)
            if (initialImages && initialImages.length > 0) {
                setFiles(initialImages.map(url => ({ file: null, preview: url })))
            } else {
                setFiles([])
            }
            setIsUploading(false)
            setSafetyError(null)
        }
    }, [initialContent, initialImages, initialLayout, isOpen])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files
        if (fileList) {
            const newFiles = Array.from(fileList).map(file => {
                return new Promise<{ file: File; preview: string }>((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                        resolve({ file, preview: reader.result as string })
                    }
                    reader.readAsDataURL(file)
                })
            })

            Promise.all(newFiles).then(res => {
                setFiles(prev => [...prev, ...res])
            })
        }
    }

    const removeImage = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return

        try {
            setIsUploading(true)

            const imageUrls: string[] = []
            for (const f of files) {
                if (f.file) {
                    try {
                        const url = await uploadFile(f.file)
                        imageUrls.push(url)
                    } catch (error) {
                        // All 400 errors from our API are treated as moderation/validation errors
                        const message = getErrorMessage(error)
                        setSafetyError({ message, preview: f.preview })
                        toast.error(message, {
                            duration: 5000,
                            position: "top-center"
                        })
                        throw new Error("moderation_error")
                    }
                } else {
                    imageUrls.push(f.preview)
                }
            }

            onSave(content, imageUrls, layout)
            handleClose()
        } catch (error) {
            if (error instanceof Error && error.message === "moderation_error") return
            console.error("Failed to upload images:", error)
            alert("Hiba a képek feltöltésekor!")
        } finally {
            setIsUploading(false)
        }
    }

    const handleClose = () => {
        onClose()
    }

    const layouts = [
        { id: "grid", icon: LayoutGrid, label: "Rács" },
        { id: "carousel", icon: Layers, label: "Lapozós" },
        { id: "collage", icon: Layout, label: "Kollázs" },
        { id: "columns", icon: Columns, label: "Oszlop" },
    ]

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={isEditing ? "Bejegyzés szerkesztése" : "Új bejegyzés"}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Bejegyzés szövege *</label>
                        <textarea
                            data-testid="portfolio-post-content"
                            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm min-h-[120px] focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                            placeholder="Írd le, mit szeretnél megosztani..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Képek feltöltése</label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {files.map((f, index) => (
                                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border bg-gray-50 group">
                                    <Image src={f.preview} alt="Preview" fill sizes="(min-width: 640px) 33vw, 50vw" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-400 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}

                            {files.length < 10 && (
                                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-primary-subtle hover:border-primary/20 transition-all group">
                                    <ImagePlus className="w-6 h-6 mb-2 text-gray-400 group-hover:text-primary" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-primary">Hozzáadás</span>
                                    <input type="file" data-testid="portfolio-image-input" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                                </label>
                            )}
                        </div>
                    </div>

                    {files.length > 1 && (
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Elrendezés kiválasztása</label>
                            <div className="grid grid-cols-4 gap-2">
                                {layouts.map((l) => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => setLayout(l.id as LayoutType)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                                            layout === l.id
                                                ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                                                : "border-gray-100 hover:bg-gray-50 text-gray-500"
                                        )}
                                    >
                                        <l.icon className="h-5 w-5" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">{l.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4">
                        <Button type="button" variant="ghost" onClick={handleClose} disabled={isUploading} className="rounded-xl font-bold">
                            Mégse
                        </Button>
                        <Button type="submit" data-testid="portfolio-post-submit" disabled={isUploading || !content.trim()} className="min-w-[140px] rounded-xl bg-primary hover:bg-primary font-bold shadow-lg shadow-primary/10">
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Mentés...
                                </>
                            ) : (
                                isEditing ? "Módosítások mentése" : "Közzététel"
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>
            <SafetyWarningModal
                isOpen={!!safetyError}
                onClose={() => setSafetyError(null)}
                message={safetyError?.message || ""}
                imagePreview={safetyError?.preview}
            />
        </>
    )
}
