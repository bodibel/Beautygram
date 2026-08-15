"use client"

import { Calendar, Image, Info } from "lucide-react"

const cards = [
    {
        title: "Foglalási kérelmek",
        value: "Kérelmek",
        description: "A függő, elfogadott és elutasított kérések lent kezelhetők.",
        icon: Calendar,
    },
    {
        title: "Szalon adatai",
        value: "Profil",
        description: "Név, cím, kategória, kapcsolat és publikus beállítások.",
        icon: Info,
    },
    {
        title: "Portfólió",
        value: "Munkák",
        description: "A bejegyzések a publikus szalonoldalon portfólióként jelennek meg.",
        icon: Image,
    },
]

export function KpiCards() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <div key={card.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/50 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{card.title}</span>
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <Icon className="h-5 w-5" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-500">{card.description}</p>
                    </div>
                )
            })}
        </div>
    )
}
