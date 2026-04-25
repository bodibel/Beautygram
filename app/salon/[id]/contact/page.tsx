"use client"

import { use, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { updateSalon } from "@/lib/actions/salon"
import { useRouter } from "next/navigation"
import { useSalonData } from "@/hooks/useSalonData"
import { toast } from "sonner"

import { ContactSettingsCard } from "@/components/salon/cards/ContactSettingsCard"

export default function SalonContactPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()
    const router = useRouter()

    const {
        salon,
        setSalon,
        loading
    } = useSalonData(id, userData?.id)

    const handleSaveContact = async (data: any) => {
        try {
            await updateSalon(id, data)
            setSalon({ ...salon!, ...data })
            toast.success("Beállítások sikeresen mentve!")
        } catch (error) {
            console.error("Error updating contact settings:", error)
            toast.error("Hiba történt a mentés során!")
        }
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-4xl p-6 lg:mr-auto">
                    <div className="text-muted-foreground">Betöltés...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon && !loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-4xl p-6 text-center lg:mr-auto">
                    <p className="text-muted-foreground">Szalon nem található vagy nincs jogosultságod.</p>
                </div>
            </MainLayout>
        )
    }

    if (!salon) return null

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full max-w-3xl p-6 md:p-8 lg:mr-auto">
                <h1 className="text-3xl font-bold mb-6">Kapcsolat & Értesítések</h1>
                <ContactSettingsCard
                    salon={salon}
                    onSave={handleSaveContact}
                />
            </div>
        </MainLayout>
    )
}
