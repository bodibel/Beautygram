"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type AccountPageShellProps = {
    icon: LucideIcon
    title: string
    description: string
    children: React.ReactNode
    actions?: React.ReactNode
    badge?: React.ReactNode
    contentClassName?: string
    containerClassName?: string
}

export function AccountPageShell({
    icon: Icon,
    title,
    description,
    children,
    actions,
    badge,
    contentClassName,
    containerClassName,
}: AccountPageShellProps) {
    return (
        <div className={cn("w-full max-w-6xl space-y-6 px-0 py-2 sm:px-2 sm:py-4 lg:mr-auto lg:space-y-8 lg:py-6", containerClassName)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4 px-1 sm:px-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
                        <p className="mt-1 text-sm text-gray-500 sm:text-base">{description}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 px-1 sm:items-end sm:px-0">
                    {badge}
                    {actions}
                </div>
            </div>

            <div className={cn("space-y-6", contentClassName)}>
                {children}
            </div>
        </div>
    )
}
