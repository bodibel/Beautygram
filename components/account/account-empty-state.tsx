"use client"

import type { LucideIcon } from "lucide-react"

type AccountEmptyStateProps = {
    icon: LucideIcon
    title: string
    description: string
    action?: React.ReactNode
}

export function AccountEmptyState({
    icon: Icon,
    title,
    description,
    action,
}: AccountEmptyStateProps) {
    return (
        <div className="rounded-[32px] border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm sm:p-12">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                <Icon className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-black text-gray-900">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 sm:text-base">
                {description}
            </p>
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    )
}
