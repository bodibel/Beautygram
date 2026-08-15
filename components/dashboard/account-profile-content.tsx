"use client"

import { useState } from "react"
import { Calendar, Edit2, Mail, Shield } from "lucide-react"

import { MainLayout } from "@/components/layout/main-layout"
import { ProfileEditModal } from "@/components/dashboard/modals/ProfileEditModal"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export function AccountProfileContent() {
    const { userData, loading } = useAuth()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="mx-auto w-full max-w-5xl rounded-2xl border border-border-subtle bg-surface p-8 shadow-soft">
                    <p className="text-sm font-semibold text-text-secondary">Profil betöltése...</p>
                </div>
            </MainLayout>
        )
    }

    if (!userData) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="mx-auto flex min-h-[50vh] w-full max-w-5xl flex-col items-center justify-center gap-4 rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
                    <h1 className="font-serif text-2xl font-black text-text-primary">Bejelentkezés szükséges</h1>
                    <p className="max-w-md text-sm leading-6 text-text-secondary">
                        Kérlek jelentkezz be a profilod és fiókbeállításaid megtekintéséhez.
                    </p>
                </div>
            </MainLayout>
        )
    }

    const roleLabel =
        userData.role === "admin" ? "Admin" : userData.role === "provider" ? "Szolgáltató" : "Látogató"
    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0">
                <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wide text-accent-primary">
                                Profil és beállítások
                            </p>
                            <h1 className="mt-3 font-serif text-3xl font-black text-text-primary sm:text-4xl">
                                Profilom
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
                                Itt kezelheted a személyes adataidat és a fiókbeállításaidat.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-full px-5 font-bold"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Szerkesztés
                        </Button>
                    </div>
                </section>

                <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft sm:p-8">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-accent-primary text-3xl font-black text-primary-foreground shadow-soft">
                            {userData.name?.[0] || "U"}
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-serif text-2xl font-black text-text-primary">
                                {userData.name || "Névtelen felhasználó"}
                            </h2>
                            <p className="mt-2 flex items-center gap-2 break-all text-sm text-text-secondary">
                                <Mail className="h-4 w-4 shrink-0" />
                                {userData.email}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border-subtle bg-surface-muted/50 p-5">
                            <div className="flex items-center gap-3">
                                <Shield className="h-4 w-4 text-accent-primary" />
                                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                                    Jogosultság
                                </span>
                            </div>
                            <p className="mt-3 font-bold text-text-primary">{roleLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-border-subtle bg-surface-muted/50 p-5">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-accent-primary" />
                                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                                    Tagság kezdete
                                </span>
                            </div>
                            <p className="mt-3 font-bold text-text-primary">2026. január</p>
                        </div>
                    </div>
                </section>

                <ProfileEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    userData={userData}
                />
            </div>
        </MainLayout>
    )
}
