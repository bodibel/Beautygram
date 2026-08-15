"use client"

import { UserManager } from "@/components/admin/UserManager"
import { MainLayout } from "@/components/layout/main-layout"

export default function AdminVisitorsPage() {
    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full p-6">
                <UserManager 
                    filterRole="visitor" 
                    title="Látogatók" 
                    description="Regisztrált látogatók (vendégek) kezelése, szerkesztése és törlése."
                />
            </div>
        </MainLayout>
    )
}
