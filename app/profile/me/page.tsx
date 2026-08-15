import { redirect } from "next/navigation"

export default function MyProfileRedirect() {
    redirect("/dashboard/account")
}
