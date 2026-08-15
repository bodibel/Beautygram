import { redirect } from "next/navigation"

export default async function DashboardSalonMessagesAliasPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  const { salonId } = await params
  redirect(`/dashboard/messages?salon=${encodeURIComponent(salonId)}`)
}
