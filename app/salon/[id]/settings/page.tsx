"use client"

import { use } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { SalonProfileContent } from "@/components/salon-console/salon-profile-content"

export default function SalonSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <MainLayout showRightSidebar={false}>
      <SalonProfileContent salonId={id} />
    </MainLayout>
  )
}
