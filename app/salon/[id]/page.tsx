"use client"

import { use } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { SalonOverviewContent } from "@/components/salon-console/salon-overview-content"

export default function SalonOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <MainLayout showRightSidebar={false}>
      <SalonOverviewContent salonId={id} />
    </MainLayout>
  )
}
