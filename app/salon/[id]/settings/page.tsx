"use client"

import { use, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { updateSalon } from "@/lib/actions/salon"
import { useRouter } from "next/navigation"
import { useSalonData } from "@/hooks/useSalonData"
import { Salon } from "@/lib/salon-types"

import { BasicInfoCard } from "@/components/salon/cards/BasicInfoCard"
import { SettingsModal } from "@/components/salon/modals/SettingsModal"

export default function SalonSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()
    const router = useRouter()

    const {
        salon,
        setSalon,
        loading
    } = useSalonData(id, userData?.id)

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

    const handleSaveSettings = async (settings: Partial<Salon>) => {
        try {
            await updateSalon(id, settings)
            setSalon({ ...salon!, ...settings })
            setIsSettingsModalOpen(false)
            alert("Az alapadatok sikeresen frissítve!")
        } catch (error) {
            console.error("Error updating salon:", error)
            alert("Hiba történt a mentés során!")
        }
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-6xl p-6 lg:mr-auto">
                    <div className="text-muted-foreground">Betöltés...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon && !loading) {
        // Use a side effect for navigation
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
            <div className="w-full max-w-7xl p-6 md:p-8 lg:mr-auto">
                <h1 className="text-3xl font-bold mb-6">Szalon adatok</h1>
                <div className="max-w-2xl">
                    <BasicInfoCard
                        salon={salon}
                        onEdit={() => setIsSettingsModalOpen(true)}
                    />
                </div>

                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    onSave={handleSaveSettings}
                    salon={salon}
                />
            </div>
        </MainLayout>
    )
}
