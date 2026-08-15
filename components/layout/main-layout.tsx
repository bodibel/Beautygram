"use client"

import { ActiveSalonIndicator } from "@/components/layout/active-salon-indicator"
import { BottomNav } from "@/components/layout/bottom-nav"
import { RightSidebar } from "@/components/layout/right-sidebar"
import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"
import { cn } from "@/lib/utils"

export function MainLayout({
  children,
  showRightSidebar = true,
  fullWidth = false,
}: {
  children: React.ReactNode
  showRightSidebar?: boolean
  fullWidth?: boolean
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <TopBar />

      <div className="mx-auto flex max-w-[1440px] flex-col items-stretch overflow-x-hidden px-4 pt-20 sm:px-6 lg:flex-row lg:items-start lg:px-8">
        <div className="hidden w-[300px] flex-shrink-0 lg:block" aria-hidden="true" />
        <Sidebar />

        <div className="flex w-full min-w-0 flex-1 items-start gap-6 pb-24 md:pb-8 lg:pl-6">
          <main
            className={cn(
              "w-full min-w-0",
              fullWidth
                ? "flex-1"
                : showRightSidebar
                  ? "lg:flex-shrink-0 lg:max-w-[480px] xl:max-w-[640px]"
                  : "mx-auto max-w-[680px] lg:flex-shrink-0"
            )}
          >
            <ActiveSalonIndicator />
            {children}
          </main>

          {showRightSidebar && (
            <div className="sticky top-20 hidden min-w-0 flex-1 self-start lg:block">
              <div className="h-[calc(100vh-5rem)] overflow-y-auto">
                <RightSidebar />
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
