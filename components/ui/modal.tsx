"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

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
        xl: "max-w-4xl",
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(
                    "border-none bg-background p-0 shadow-lg outline-none",
                    "max-h-[90vh] overflow-hidden sm:rounded-2xl",
                    sizeClasses[size]
                )}
                hideCloseButton
                onPointerDownOutside={onClose}
                onEscapeKeyDown={onClose}
            >
                <DialogTitle className="sr-only">{title || "Ablak"}</DialogTitle>
                <DialogDescription className="sr-only">{title || "Tartalom"}</DialogDescription>

                <div className="flex items-center gap-3 border-b border-black/5 bg-background px-6 py-5">
                    {title ? (
                        <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">
                            {title}
                        </h2>
                    ) : (
                        <span className="sr-only">Ablak fejléc</span>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="ml-auto h-9 w-9 rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Bezárás</span>
                    </Button>
                </div>

                <div className="max-h-[calc(90vh-84px)] overflow-y-auto px-6 py-6">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    )
}
