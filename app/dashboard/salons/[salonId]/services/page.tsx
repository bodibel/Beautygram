import { SalonServicesContent } from "@/components/salon-console/salon-services-content"

export default async function DashboardSalonServicesPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  return <SalonServicesContent salonId={salonId} />
}
