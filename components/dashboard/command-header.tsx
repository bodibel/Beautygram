"use client"

import Link from "next/link"
import { Bell, ExternalLink } from "lucide-react"

export function CommandHeader({
    salonName,
    publicProfileHref,
}: {
    salonName: string
    publicProfileHref?: string
}) {
    const today = new Date().toLocaleDateString("hu-HU", {
        weekday: "long",
        month: "long",
        day: "numeric",
    })

    return (
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-primary">Studio Console</p>
                <h1 className="mt-2 break-words text-2xl font-bold text-gray-900 sm:text-3xl">
                    {salonName} szalonkezelő
                </h1>
                <p className="text-gray-500">Áttekintés a szalon aktuális feladatairól · {today}</p>
            </div>

            <div className="flex w-full min-w-0 flex-wrap items-center gap-3 md:w-auto md:flex-nowrap md:gap-4">
                {publicProfileHref && (
                    <Link
                        href={publicProfileHref}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Publikus oldal
                    </Link>
                )}
                <div className="relative min-w-0 flex-1 md:flex-none">
                    <input
                        type="text"
                        placeholder="Keresés a szalonkezelőben..."
                        className="w-full rounded-full border-0 bg-white px-4 py-2.5 pr-10 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-primary md:w-64"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
                <button className="relative shrink-0 rounded-full bg-white p-2.5 ring-1 ring-gray-200 hover:bg-gray-50" aria-label="Értesítések">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>
            </div>
        </div>
    )
}
