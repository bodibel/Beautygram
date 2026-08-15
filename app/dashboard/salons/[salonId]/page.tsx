import { SalonOverviewContent } from "@/components/salon-console/salon-overview-content"

export default async function DashboardSalonAliasPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  return <SalonOverviewContent salonId={salonId} />
}
