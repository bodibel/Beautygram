import { SalonBookingsContent } from "@/components/salon-console/salon-bookings-content"

export default async function DashboardSalonBookingsAliasPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  return <SalonBookingsContent salonId={salonId} />
}
