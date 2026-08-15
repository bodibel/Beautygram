"use client"

import { Button } from "@/components/ui/button"

export function HeroBanner() {
    return (
        <div className="relative w-full overflow-hidden rounded-3xl bg-gray-900 text-white shadow-xl">
            {/* Background Image / Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent z-10" />
            <div
                className="absolute inset-0 bg-cover bg-center opacity-70"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1621786030484-4c855b314a67?q=80&w=2070&auto=format&fit=crop')",
                }}
            />

            <div className="relative z-20 flex flex-col items-start gap-3 p-6 sm:p-8 md:max-w-[70%]">
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                    A Hónap Szalonja
                </span>
                <h2 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl font-serif">
                    Prémium Élmény: <br />
                    <span className="text-primary/70">Lumière</span> Aesthetics
                </h2>
                <p className="text-sm text-gray-300 max-w-md">
                    Fedezd fel exkluzív arckezeléseinket és spa csomagjainkat.
                </p>
                <Button className="mt-2 rounded-full bg-white text-gray-900 hover:bg-gray-100 px-6 py-4 text-sm font-semibold h-auto">
                    Különleges Ajánlatok
                </Button>
            </div>
        </div>
    )
}
