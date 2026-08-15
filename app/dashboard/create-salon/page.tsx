import { redirect } from "next/navigation"

export default function CreateSalonRedirectPage() {
    redirect("/dashboard/salons?create=1")
}
