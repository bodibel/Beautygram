"use client"

import { UserManager } from "@/components/admin/UserManager"
import { MainLayout } from "@/components/layout/main-layout"

export default function AdminProvidersPage() {
    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full p-6">
                <UserManager 
                    filterRole="provider" 
                    title="Szolgáltatók" 
                    description="Regisztrált szolgáltatók (szalon tulajdonosok) kezelése, szerkesztése és törlése."
                />
            </div>
        </MainLayout>
    )
}
