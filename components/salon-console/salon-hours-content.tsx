"use client"

import { useState } from "react"

import { ClosedDatesCard } from "@/components/salon/cards/ClosedDatesCard"
import { HoursCard } from "@/components/salon/cards/HoursCard"
import { ClosedDateModal } from "@/components/salon/modals/ClosedDateModal"
import { HoursModal } from "@/components/salon/modals/HoursModal"
import { useSalonData } from "@/hooks/useSalonData"
import { createClosedDate, deleteClosedDate, saveOpeningHours } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { OpeningHour } from "@/lib/salon-types"

export function SalonHoursContent({ salonId }: { salonId: string }) {
  const { userData } = useAuth()
  const {
    salon,
    openingHours,
    setOpeningHours,
    closedDates,
    setClosedDates,
    loading,
  } = useSalonData(salonId, userData?.id)

  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false)
  const [isClosedDatesModalOpen, setIsClosedDatesModalOpen] = useState(false)

  const handleSaveHours = async (hours: OpeningHour[]) => {
    try {
      await saveOpeningHours(salonId, hours)
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
        salonId,
        date,
        reason,
      })
      setClosedDates([
        ...closedDates,
        {
          id: newClosedDate.id,
          date: new Date(newClosedDate.date).toISOString(),
          reason: newClosedDate.reason,
        },
      ].sort((a, b) => a.date.localeCompare(b.date)))
      setIsClosedDatesModalOpen(false)
    } catch (error) {
      console.error("Error adding closed date:", error)
    }
  }

  const handleDeleteClosedDate = async (closedId: string) => {
    if (confirm("Biztosan törlöd ezt a zárt napot?")) {
      try {
        await deleteClosedDate(closedId)
        setClosedDates(closedDates.filter((closedDate) => closedDate.id !== closedId))
      } catch (error) {
        console.error("Error deleting closed date:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-muted-foreground">Betöltés...</div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Szalon nem található vagy nincs jogosultságod.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-10 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Nyitvatartás és szünetek</h1>
        <p className="text-gray-500">Kezeld szalonod elérhetőségét és tervezett szüneteit.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HoursCard hours={openingHours} onEdit={() => setIsHoursModalOpen(true)} />
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
  )
}
