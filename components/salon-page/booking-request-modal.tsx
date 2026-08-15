"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, LogIn } from "lucide-react"
import { toast } from "sonner"

import { AuthModal } from "@/components/auth/auth-modal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { SalonPageData, SalonPageService } from "@/components/salon-page/types"
import { createBooking } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"

interface BookingRequestModalProps {
  isOpen: boolean
  onClose: () => void
  salon: SalonPageData
  initialService?: SalonPageService | null
  initialDate?: string
}

export function BookingRequestModal({ isOpen, onClose, salon, initialService, initialDate }: BookingRequestModalProps) {
  const { userData } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [serviceId, setServiceId] = useState(initialService?.id || salon.services?.[0]?.id || "")
  const [date, setDate] = useState(initialDate || "")
  const [time, setTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) setServiceId(initialService?.id || salon.services?.[0]?.id || "")
  }, [initialService?.id, isOpen, salon.services])

  useEffect(() => {
    if (isOpen) setDate(initialDate || "")
  }, [initialDate, isOpen])

  const selectedService = useMemo(
    () => salon.services?.find((service) => service.id === serviceId),
    [salon.services, serviceId],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userData?.id) {
      setIsAuthModalOpen(true)
      return
    }
    if (!serviceId || !date || !time) {
      toast.error("Válassz szolgáltatást, dátumot és időpontot.")
      return
    }

    setIsSubmitting(true)
    try {
      await createBooking({
        userId: userData.id,
        salonId: salon.id,
        serviceId,
        date,
        time,
      })
      toast.success("Időpontkérés elküldve.")
      onClose()
      setDate("")
      setTime("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nem sikerült elküldeni az időpontkérést.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!userData) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="rounded-[28px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bejelentkezés szükséges</DialogTitle>
              <DialogDescription>Időpontkérés küldéséhez jelentkezz be vagy regisztrálj.</DialogDescription>
            </DialogHeader>
            <Button type="button" onClick={() => setIsAuthModalOpen(true)} className="min-h-[48px] rounded-full">
              <LogIn className="mr-2 h-4 w-4" />
              Bejelentkezés
            </Button>
          </DialogContent>
        </Dialog>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[28px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Időpontkérés</DialogTitle>
          <DialogDescription>
            A kérés elküldése nem jelent automatikus foglalást. A szalon visszaigazolja vagy elutasítja az időpontot.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="grid gap-2 text-sm font-bold text-text-primary">
            Szolgáltatás
            <select
              data-testid="booking-service-select"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="min-h-[48px] rounded-2xl border border-border-subtle bg-background px-4 text-sm font-semibold outline-none"
            >
              <option value="" disabled>
                Válassz szolgáltatást
              </option>
              {salon.services?.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          {selectedService && (
            <div className="rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-text-secondary">
              <span className="font-bold text-text-primary">{selectedService.name}</span>
              {selectedService.duration ? ` · ${selectedService.duration}` : ""}
              {selectedService.price ? ` · ${selectedService.price} ${salon.currency || ""}` : ""}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-text-primary">
              Dátum
              <input
                data-testid="booking-date-input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="min-h-[48px] rounded-2xl border border-border-subtle bg-background px-4 text-sm font-semibold outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-text-primary">
              Idő
              <input
                data-testid="booking-time-input"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="min-h-[48px] rounded-2xl border border-border-subtle bg-background px-4 text-sm font-semibold outline-none"
              />
            </label>
          </div>

          <Button type="submit" data-testid="booking-submit" disabled={isSubmitting || !salon.services?.length} className="min-h-[50px] w-full rounded-full">
            <CalendarClock className="mr-2 h-4 w-4" />
            {isSubmitting ? "Küldés..." : "Időpontkérés küldése"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
