"use client"

import { CalendarCheck, CalendarX } from "lucide-react"

import { BookingRequests } from "@/components/dashboard/booking-requests"
import { CommandHeader } from "@/components/dashboard/command-header"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PortfolioVibeWidget } from "@/components/dashboard/portfolio-vibe-widget"
import { useAuth } from "@/lib/auth-context"
import { useSalonData } from "@/hooks/useSalonData"

export function SalonOverviewContent({ salonId }: { salonId: string }) {
  const { userData } = useAuth()
  const { salon, loading } = useSalonData(salonId, userData?.id)

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4 sm:p-6">
        <div className="text-gray-400">Szalonkezelő betöltése...</div>
      </div>
    )
  }

  if (!salon) {
    return <div className="p-4 sm:p-6">Szalon nem található vagy nincs jogosultságod.</div>
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8 lg:space-y-10">
      <CommandHeader salonName={salon.name} publicProfileHref={`/profile/${salon.slug}`} />
      <KpiCards />

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-8">
          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${salon.allowBookings ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {salon.allowBookings ? <CalendarCheck className="h-5 w-5" /> : <CalendarX className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Online foglalás</p>
                  <p className="text-xs leading-5 text-gray-500">
                    {salon.allowBookings
                      ? "A vendégek jelenleg küldhetnek időpontkérést."
                      : "A vendégek jelenleg nem tudnak online időpontot kérni."}
                  </p>
                </div>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${salon.allowBookings ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {salon.allowBookings ? "Bekapcsolva" : "Kikapcsolva"}
              </span>
            </div>
            <BookingRequests salonId={salon.id} />
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <PortfolioVibeWidget />
          </div>
        </div>
      </div>
    </div>
  )
}
