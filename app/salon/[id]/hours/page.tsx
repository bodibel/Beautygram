"use client"

import { use, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { saveOpeningHours, createClosedDate, deleteClosedDate } from "@/lib/actions/salon"
import { useRouter } from "next/navigation"
import { useSalonData } from "@/hooks/useSalonData"
import { OpeningHour } from "@/lib/salon-types"

import { HoursCard } from "@/components/salon/cards/HoursCard"
import { ClosedDatesCard } from "@/components/salon/cards/ClosedDatesCard"
import { HoursModal } from "@/components/salon/modals/HoursModal"
import { ClosedDateModal } from "@/components/salon/modals/ClosedDateModal"

export default function SalonHoursPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()
    const router = useRouter()

    const {
        salon,
        openingHours,
        setOpeningHours,
        closedDates,
        setClosedDates,
        loading
    } = useSalonData(id, userData?.id)

    const [isHoursModalOpen, setIsHoursModalOpen] = useState(false)
    const [isClosedDatesModalOpen, setIsClosedDatesModalOpen] = useState(false)

    const handleSaveHours = async (hours: OpeningHour[]) => {
        try {
            await saveOpeningHours(id, hours)

            setOpeningHours(hours)
            setIsHoursModalOpen(false)
            alert("Nyitvatartás sikeresen frissítve!")
        } catch (error) {
            console.error("Error saving hours:", error)
            alert("Hiba történt a mentés során!")
        }
    }

    const handleSaveClosedDate = async (date: string, reason: string) => {
        try {
            const newClosedDate = await createClosedDate({
                salonId: id,
                date,
                reason,
            })
            // @ts-ignore
            setClosedDates([...closedDates, newClosedDate].sort((a, b) => a.date.localeCompare(b.date)))
            setIsClosedDatesModalOpen(false)
        } catch (error) {
            console.error("Error adding closed date:", error)
        }
    }

    const handleDeleteClosedDate = async (closedId: string) => {
        if (confirm("Biztosan törlöd ezt a zárt napot?")) {
            try {
                await deleteClosedDate(closedId)
                setClosedDates(closedDates.filter(c => c.id !== closedId))
            } catch (error) {
                console.error("Error deleting closed date:", error)
            }
        }
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-5xl p-6 lg:mr-auto">
                    <div className="text-muted-foreground">Betöltés...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon) {
        router.push("/dashboard")
        return null
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full max-w-5xl space-y-10 p-6 md:p-8 lg:mr-auto">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Nyitvatartás és Szünetek</h1>
                    <p className="text-gray-500">Kezeld szalonod elérhetőségét és tervezett szüneteit.</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <HoursCard
                            hours={openingHours}
                            onEdit={() => setIsHoursModalOpen(true)}
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <ClosedDatesCard
                            closedDates={closedDates}
                            onAdd={() => setIsClosedDatesModalOpen(true)}
                            onDelete={handleDeleteClosedDate}
                        />
                    </div>
                </div>

                <HoursModal
                    isOpen={isHoursModalOpen}
                    onClose={() => setIsHoursModalOpen(false)}
                    onSave={handleSaveHours}
                    hours={openingHours}
                />

                <ClosedDateModal
                    isOpen={isClosedDatesModalOpen}
                    onClose={() => setIsClosedDatesModalOpen(false)}
                    onSave={handleSaveClosedDate}
                />
            </div>
        </MainLayout>
    )
}
