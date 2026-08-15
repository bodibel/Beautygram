"use client"

import { use } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { SalonBookingsContent } from "@/components/salon-console/salon-bookings-content"

export default function SalonBookingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <MainLayout showRightSidebar={false} fullWidth>
      <div className="p-4 md:p-8">
        <SalonBookingsContent salonId={id} />
      </div>
    </MainLayout>
  )
}
