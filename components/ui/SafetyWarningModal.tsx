"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Image from "next/image"

interface SafetyWarningModalProps {
    isOpen: boolean
    onClose: () => void
    message: string
    imagePreview?: string | null
}

export function SafetyWarningModal({ isOpen, onClose, message, imagePreview }: SafetyWarningModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none shadow-2xl z-[300]">
                <DialogHeader className="flex flex-col items-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold text-gray-900 border-none">Tartalmi korlátozás</DialogTitle>
                        <p className="text-sm text-gray-500 mt-2">{message}</p>
                    </div>
                </DialogHeader>

                {imagePreview && (
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Érintett kép:</p>
                        <div className="relative aspect-square w-40 rounded-2xl overflow-hidden border-4 border-amber-50 shadow-lg shadow-amber-100/50">
                            <Image src={imagePreview} alt="Problematic" fill sizes="160px" className="w-full h-full object-cover grayscale opacity-50" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <AlertTriangle className="h-10 w-10 text-white/80" />
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-8 flex gap-3 sm:justify-center">
                    <Button
                        onClick={onClose}
                        className="w-full rounded-2xl bg-gray-900 hover:bg-black text-white font-bold h-12 shadow-xl shadow-gray-200"
                    >
                        Értem
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
