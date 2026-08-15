import { BookingRequests } from "@/components/dashboard/booking-requests"
import { BookingAvailabilityToggle } from "@/components/salon-console/booking-availability-toggle"

export function SalonBookingsContent({ salonId }: { salonId: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Studio Console</p>
          <h1 className="mt-2 text-3xl font-black text-gray-900">Foglalási kérelmek</h1>
          <p className="mt-2 max-w-2xl text-gray-500">
            Itt kezelhetők a függő, elfogadott, elutasított és visszavont időpontkérések.
          </p>
        </div>
        <BookingAvailabilityToggle salonId={salonId} />
      </div>
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <BookingRequests salonId={salonId} />
      </div>
    </div>
  )
}
