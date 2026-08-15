import { SalonTeamContent } from "@/components/salon-console/salon-team-content"

export default async function DashboardSalonTeamPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  return <SalonTeamContent salonId={salonId} />
}
