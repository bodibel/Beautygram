import { redirect } from "next/navigation"

import { getActiveSessionUser } from "@/lib/auth-utils"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getActiveSessionUser()

    if (!user) {
        redirect("/")
    }

    return children
}
