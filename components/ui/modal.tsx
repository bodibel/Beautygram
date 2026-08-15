"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    title?: string
    size?: "sm" | "md" | "lg" | "xl"
}

export function Modal({ isOpen, onClose, children, title, size = "md" }: ModalProps) {
    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl"
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-[100] bg-text-primary/45 backdrop-blur-md" />
                <DialogContent
                    className={cn(
                        "fixed left-[50%] top-[50%] z-[101] grid w-[calc(100vw-2rem)] translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden border border-border-subtle bg-surface-elevated p-0 shadow-[0_28px_90px_rgba(48,36,30,0.24)] duration-200 sm:rounded-[32px]",
                        "scrollbar-none max-h-[90vh] overflow-y-auto outline-none",
                        sizeClasses[size]
                    )}
                    onPointerDownOutside={onClose}
                    onEscapeKeyDown={onClose}
                >
                    <DialogTitle className="sr-only">{title || "Ablak"}</DialogTitle>
                    <DialogDescription className="sr-only">{title || "Tartalom"}</DialogDescription>
                    <div className="sticky top-0 z-10 border-b border-border-subtle bg-surface-elevated/95 px-6 pb-4 pt-6 backdrop-blur-xl">
                        {title && <h2 className="font-serif text-2xl font-semibold leading-tight tracking-tight text-text-primary">{title}</h2>}
                    </div>
                    <div className="px-6 pb-6 pt-5">{children}</div>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    )
}
