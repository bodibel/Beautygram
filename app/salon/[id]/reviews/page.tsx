"use client"

import { use } from "react"
import { Star } from "lucide-react"

import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { useSalonData } from "@/hooks/useSalonData"

export default function SalonReviewsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()
    const { salon, loading } = useSalonData(id, userData?.id)

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto w-full max-w-4xl p-4 md:p-8">
                <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Star className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900">Vélemények</h1>
                    <p className="mt-2 text-gray-500">
                        {loading
                            ? "Vélemények betöltése..."
                            : salon
                                ? `${salon.rating.toFixed(1)} / 5 · ${salon.reviewCount} értékelés`
                                : "A vélemények jelenleg nem érhetők el."}
                    </p>
                    <p className="mt-6 text-sm leading-6 text-gray-500">
                        A részletes véleménykezelő későbbi fázisban érkezik. A publikus szalonoldalon csak valós értékelési adat jelenik meg, hamis értékelés nélkül.
                    </p>
                </div>
            </div>
        </MainLayout>
    )
}
