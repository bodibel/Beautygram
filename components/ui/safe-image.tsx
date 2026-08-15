"use client"

import Image, { type ImageProps } from "next/image"
import { ImageOff } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type SafeImageProps = ImageProps & {
    fallbackSrc?: ImageProps["src"]
    fallbackClassName?: string
}

export function SafeImage({ src, alt, className, fallbackSrc, fallbackClassName, onError, ...props }: SafeImageProps) {
    const [failedOriginal, setFailedOriginal] = useState<string | null>(null)
    const [failedFallback, setFailedFallback] = useState<string | null>(null)
    const srcKey = typeof src === "string" ? src : "static-src"
    const fallbackKey = typeof fallbackSrc === "string" ? fallbackSrc : "static-fallback"
    const showFallback = failedOriginal === srcKey && fallbackSrc && failedFallback !== fallbackKey
    const failed = failedOriginal === srcKey && (!fallbackSrc || failedFallback === fallbackKey)
    const currentSrc = showFallback ? fallbackSrc : src

    if (failed) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center bg-muted text-muted-foreground",
                    props.fill && "absolute inset-0 h-full w-full",
                    fallbackClassName
                )}
                role="img"
                aria-label={typeof alt === "string" && alt.length > 0 ? alt : "Nem elérhető kép"}
            >
                <ImageOff className="h-8 w-8 opacity-40" />
            </div>
        )
    }

    return (
        <Image
            {...props}
            src={currentSrc}
            alt={alt}
            className={className}
            onError={(event) => {
                onError?.(event)
                if (showFallback) {
                    setFailedFallback(fallbackKey)
                    return
                }
                setFailedOriginal(srcKey)
            }}
        />
    )
}
