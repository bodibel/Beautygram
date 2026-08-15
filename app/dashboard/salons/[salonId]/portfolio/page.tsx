import { SalonPortfolioContent } from "@/components/salon-console/salon-portfolio-content"

export default async function DashboardSalonPortfolioPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  return <SalonPortfolioContent salonId={salonId} />
}
