"use client"

import { use } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { SalonTeamContent } from "@/components/salon-console/salon-team-content"

export default function SalonTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <MainLayout showRightSidebar={false}>
      <SalonTeamContent salonId={id} />
    </MainLayout>
  )
}
