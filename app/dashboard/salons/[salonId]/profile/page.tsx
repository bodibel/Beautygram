import { SalonProfileContent } from "@/components/salon-console/salon-profile-content"

export default async function DashboardSalonProfilePage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  return <SalonProfileContent salonId={salonId} />
}
