"use client"

import Link from "next/link"
import { Briefcase, Calendar, Image, Settings } from "lucide-react"
import { useParams } from "next/navigation"

import { DashboardSalonSection, getDashboardSalonHref } from "@/lib/navigation-config"

const quickActions = [
    { label: "Szalon adatai", section: "profile", icon: Settings },
    { label: "Szolgáltatások", section: "services", icon: Briefcase },
    { label: "Portfólió", section: "portfolio", icon: Image },
    { label: "Nyitvatartás", section: "hours", icon: Calendar },
] satisfies Array<{ label: string; section: DashboardSalonSection; icon: typeof Settings }>

export function PortfolioVibeWidget() {
    const params = useParams()
    const salonId = typeof params.salonId === "string"
        ? params.salonId
        : typeof params.id === "string"
            ? params.id
            : ""

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-gray-900">Gyors műveletek</h3>
                <p className="text-sm text-gray-500">A szalonkezelő legfontosabb részei.</p>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="grid gap-3">
                    {quickActions.map((action) => {
                        const Icon = action.icon
                        return (
                            <Link
                                key={action.section}
                                href={getDashboardSalonHref(salonId, action.section)}
                                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition-all duration-500 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="font-bold text-gray-900">{action.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
