"use client"

import { use } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { SalonPortfolioContent } from "@/components/salon-console/salon-portfolio-content"

export default function SalonPostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <MainLayout showRightSidebar={false}>
      <SalonPortfolioContent salonId={id} />
    </MainLayout>
  )
}
