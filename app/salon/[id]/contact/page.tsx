"use client"

import { use } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { updateSalon } from "@/lib/actions/salon"
import { useSalonData } from "@/hooks/useSalonData"
import { toast } from "sonner"

import { ContactSettingsCard } from "@/components/salon/cards/ContactSettingsCard"

type ContactSettingsData = {
    phone?: string | null
    email?: string | null
    showPhoneOnProfile?: boolean
    showEmailOnProfile?: boolean
    allowMessages?: boolean
    allowBookings?: boolean
    notifyNewMessage?: boolean
    notifyNewBooking?: boolean
    notifyNewReview?: boolean
    notifyNewFavorite?: boolean
    notifyPostLike?: boolean
    notifyPostComment?: boolean
    notifyWeeklyStats?: boolean
    notifyMonthlyStats?: boolean
}

export default function SalonContactPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()

    const {
        salon,
        setSalon,
        loading
    } = useSalonData(id, userData?.id)

    const handleSaveContact = async (data: ContactSettingsData) => {
        try {
            await updateSalon(id, data)
            setSalon({
                ...salon!,
                ...data,
                phone: data.phone || undefined,
                email: data.email || undefined,
            })
            toast.success("Beállítások sikeresen mentve!")
        } catch (error) {
            console.error("Error updating contact settings:", error)
            toast.error("Hiba történt a mentés során!")
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="container mx-auto p-6">
                    <div className="text-muted-foreground">Betöltés...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon && !loading) {
        return (
            <MainLayout showRightSidebar={false}>
                <div className="container mx-auto p-6 text-center">
                    <p className="text-muted-foreground">Szalon nem található vagy nincs jogosultságod.</p>
                </div>
            </MainLayout>
        )
    }

    if (!salon) return null

    return (
        <MainLayout showRightSidebar={false}>
            <div className="container mx-auto p-6 md:p-8 max-w-3xl">
                <h1 className="text-3xl font-bold mb-6">Kapcsolat & Értesítések</h1>
                <ContactSettingsCard
                    salon={salon}
                    onSave={handleSaveContact}
                />
            </div>
        </MainLayout>
    )
}
