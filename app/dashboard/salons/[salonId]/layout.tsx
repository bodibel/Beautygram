import { MainLayout } from "@/components/layout/main-layout"
import { requireSalonConsoleOwner } from "@/lib/salon-console-auth"

export default async function DashboardSalonAliasLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  await requireSalonConsoleOwner(salonId)

  return (
    <MainLayout showRightSidebar={false} fullWidth>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-2 py-2 sm:px-0">
        {children}
      </div>
    </MainLayout>
  )
}
