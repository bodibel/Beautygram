"use client"

import { use } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { SalonHoursContent } from "@/components/salon-console/salon-hours-content"

export default function SalonHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <MainLayout showRightSidebar={false}>
      <SalonHoursContent salonId={id} />
    </MainLayout>
  )
}
