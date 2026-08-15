import { requireSalonConsoleOwner } from "@/lib/salon-console-auth"

export default async function SalonConsoleLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    await requireSalonConsoleOwner(id)

    return children
}
