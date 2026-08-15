"use client"

import { use } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { SalonServicesContent } from "@/components/salon-console/salon-services-content"

export default function SalonServicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <MainLayout showRightSidebar={false}>
      <SalonServicesContent salonId={id} />
    </MainLayout>
  )
}
