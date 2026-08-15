"use client"

import { useState } from "react"

import { BasicInfoCard } from "@/components/salon/cards/BasicInfoCard"
import { SettingsModal } from "@/components/salon/modals/SettingsModal"
import { useSalonData } from "@/hooks/useSalonData"
import { updateSalon } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { Salon } from "@/lib/salon-types"

export function SalonProfileContent({ salonId }: { salonId: string }) {
  const { userData } = useAuth()
  const { salon, setSalon, loading } = useSalonData(salonId, userData?.id)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  const handleSaveSettings = async (settings: Partial<Salon>) => {
    try {
      await updateSalon(salonId, settings)
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
    <div className="container mx-auto max-w-7xl p-6 md:p-8">
      <h1 className="mb-6 text-3xl font-bold">Szalon adatok</h1>
      <div className="max-w-2xl">
        <BasicInfoCard salon={salon} onEdit={() => setIsSettingsModalOpen(true)} />
      </div>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        salon={salon}
      />
    </div>
  )
}
