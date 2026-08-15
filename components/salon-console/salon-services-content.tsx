"use client"

import { useState } from "react"

import { ServicesCard } from "@/components/salon/cards/ServicesCard"
import { ServiceModal } from "@/components/salon/modals/ServiceModal"
import { useSalonData } from "@/hooks/useSalonData"
import { createService, deleteService, updateService } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { Service } from "@/lib/salon-types"

export function SalonServicesContent({ salonId }: { salonId: string }) {
  const { userData } = useAuth()
  const { salon, services, setServices, loading } = useSalonData(salonId, userData?.id)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const handleSaveService = async (serviceData: Omit<Service, "id">) => {
    try {
      if (editingService) {
        await updateService(editingService.id, serviceData)
        setServices(services.map((service) =>
          service.id === editingService.id ? { ...service, id: editingService.id, ...serviceData } : service
        ))
      } else {
        const newService = await createService({ ...serviceData, salonId })
        setServices([...services, newService as unknown as Service])
      }
      setIsServiceModalOpen(false)
      setEditingService(null)
    } catch (error) {
      console.error("Error saving service:", error)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (confirm("Biztosan törlöd ezt a szolgáltatást?")) {
      try {
        await deleteService(serviceId)
        setServices(services.filter((service) => service.id !== serviceId))
      } catch (error) {
        console.error("Error deleting service:", error)
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
    <div className="container mx-auto space-y-8 p-6">
      <h1 className="mb-6 text-3xl font-bold">Szolgáltatások</h1>
      <ServicesCard
        services={services}
        currency={salon.currency}
        onAdd={() => {
          setEditingService(null)
          setIsServiceModalOpen(true)
        }}
        onEdit={(service) => {
          setEditingService(service)
          setIsServiceModalOpen(true)
        }}
        onDelete={handleDeleteService}
      />

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false)
          setEditingService(null)
        }}
        onSave={handleSaveService}
        service={editingService || undefined}
        currency={salon.currency}
      />
    </div>
  )
}
