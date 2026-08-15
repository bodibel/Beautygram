import { redirect } from "next/navigation"

import { getActiveSessionUser } from "@/lib/auth-utils"

/**
 * Admin szekció szerver oldali guardja.
 *
 * A `proxy.ts` már szűri a `/dashboard/admin` útvonalat, de a Next.js dokumentáció
 * kifejezetten javasolja, hogy a jogosultság-ellenőrzés ne kizárólag a proxy rétegen
 * múljon (a matcher módosítása vagy egy áthelyezett route csendben kinyithatná a szekciót).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getActiveSessionUser()

    if (!user) {
        redirect("/?authRequired=true")
    }

    if (user.role !== "admin") {
        redirect("/dashboard?forbidden=true")
    }

    return children
}
