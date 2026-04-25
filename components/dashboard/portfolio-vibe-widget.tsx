"use client"

import { Camera, FileText, Image as ImageIcon, Sparkles } from "lucide-react"
import Image from "next/image"

type PortfolioVibeWidgetProps = {
    images: string[]
    postsCount: number
    servicesCount: number
    totalInteractions: number
}

export function PortfolioVibeWidget({
    images,
    postsCount,
    servicesCount,
    totalInteractions,
}: PortfolioVibeWidgetProps) {
    const previewImages = images.slice(0, 6)

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-gray-900">Portfólió összegzés</h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    {images.length} kép
                </span>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <FileText className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Bejegyzések</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{postsCount}</p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Interakciók</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{totalInteractions}</p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                            <Camera className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Galéria képek</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{images.length}</p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Szolgáltatások</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{servicesCount}</p>
                    </div>
                </div>

                <div className="mt-6">
                    <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-400">Portfólió előnézet</span>
                    {previewImages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                            Még nincs feltöltött képed a portfólióban.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {previewImages.map((src, i) => (
                                <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                                    <Image src={src} alt="Portfólió kép" fill className="object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
