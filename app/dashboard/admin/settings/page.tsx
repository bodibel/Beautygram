"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryManager } from "@/components/admin/CategoryManager"

export default function AdminSettingsPage() {
    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full p-6">
                <h1 className="text-3xl font-bold mb-6">Beállítások</h1>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Oldal beállítások</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Itt lehet kezelni az oldal globális beállításait.</p>
                        </CardContent>
                    </Card>

                    <CategoryManager />
                </div>
            </div>
        </MainLayout>
    )
}
