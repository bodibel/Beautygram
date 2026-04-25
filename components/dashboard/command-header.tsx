"use client"

import { Bell, CalendarDays, MessageSquareMore } from "lucide-react"

type CommandHeaderProps = {
    salonName: string
    pendingRequests: number
    unreadMessages: number
}

export function CommandHeader({ salonName, pendingRequests, unreadMessages }: CommandHeaderProps) {
    const today = new Date().toLocaleDateString("hu-HU", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    })

    return (
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-gray-900 sm:text-3xl">
                    Áttekintés, {salonName}
                </h1>
                <p className="mt-1 text-gray-500">Mai nap: {today}. Itt látod a szalonod aktuális állapotát.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageSquareMore className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Üzenetek</p>
                        <p className="text-sm font-bold text-gray-900">
                            {unreadMessages > 0 ? `${unreadMessages} új üzenet` : "Nincs új üzenet"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Időpontkérések</p>
                        <p className="text-sm font-bold text-gray-900">
                            {pendingRequests > 0 ? `${pendingRequests} függő kérés` : "Nincs függő kérés"}
                        </p>
                    </div>
                </div>

                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                    <Bell className="h-5 w-5 text-gray-600" />
                    {(unreadMessages > 0 || pendingRequests > 0) && (
                        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                </div>
            </div>
        </div>
    )
}
