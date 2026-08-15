import { SalonHoursContent } from "@/components/salon-console/salon-hours-content"

export default async function DashboardSalonHoursPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  return <SalonHoursContent salonId={salonId} />
}
