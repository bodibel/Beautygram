"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"

const Avatar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className
        )}
        {...props}
    />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
    HTMLImageElement,
    React.ComponentProps<typeof Image>
>(({ className, alt = "", ...props }, ref) => {
    const [error, setError] = React.useState(false)

    if (error || !props.src) return null

    return (
        <Image
            ref={ref}
            className={cn("aspect-square h-full w-full object-cover", className)}
            onError={() => setError(true)}
            alt={alt}
            fill
            sizes="40px"
            {...props}
        />
    )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
            className
        )}
        {...props}
    />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
