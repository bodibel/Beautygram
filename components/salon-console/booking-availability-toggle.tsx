"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { getSalonBookingAvailability, setSalonBookingAvailability } from "@/lib/actions/salon"
import { cn } from "@/lib/utils"

export function BookingAvailabilityToggle({ salonId }: { salonId: string }) {
  const [allowBookings, setAllowBookings] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadAvailability = async () => {
      try {
        const value = await getSalonBookingAvailability(salonId)
        if (mounted) setAllowBookings(value)
      } catch (error) {
        console.error("Booking availability load failed:", error)
        if (mounted) toast.error("Nem sikerült betölteni az időpontfoglalás állapotát.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadAvailability()

    return () => {
      mounted = false
    }
  }, [salonId])

  const handleToggle = async (checked: boolean) => {
    if (allowBookings === null || saving) return

    const previousValue = allowBookings
    setAllowBookings(checked)
    setSaving(true)

    try {
      const savedValue = await setSalonBookingAvailability(salonId, checked)
      setAllowBookings(savedValue)
      toast.success(checked ? "Időpontfoglalás bekapcsolva." : "Időpontfoglalás kikapcsolva.")
    } catch (error) {
      console.error("Booking availability update failed:", error)
      setAllowBookings(previousValue)
      toast.error("Nem sikerült menteni az időpontfoglalás beállítását.")
    } finally {
      setSaving(false)
    }
  }

  const isBusy = loading || saving
  const isEnabled = allowBookings ?? false

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white/80 p-4 shadow-sm sm:min-w-[320px]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Időpontfoglalás</p>
            <p className="text-xs leading-5 text-gray-500">
              {loading
                ? "Állapot betöltése"
                : isEnabled
                  ? "Látható és kérhető a szalon oldalon"
                  : "Rejtve a szalon oldalán"}
            </p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isBusy || allowBookings === null}
          aria-label="Időpontfoglalás kapcsoló"
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-bold">
        <span className={cn("rounded-full px-2.5 py-1", isEnabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>
          {loading ? "Betöltés" : isEnabled ? "Bekapcsolva" : "Kikapcsolva"}
        </span>
        {isBusy && (
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Mentés
          </span>
        )}
      </div>
    </div>
  )
}
