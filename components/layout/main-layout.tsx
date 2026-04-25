"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { RightSidebar } from "@/components/layout/right-sidebar"
import { cn } from "@/lib/utils"

export function MainLayout({
  children,
  showRightSidebar = true,
  fullWidth = false,
  showLeftSidebar = true,
}: {
  children: React.ReactNode
  showRightSidebar?: boolean
  fullWidth?: boolean
  showLeftSidebar?: boolean
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* TopBar — sticky, full width, content within 1440px */}
      <TopBar />

      {/* 1440px container — three-column layout */}
      <div className="mx-auto flex max-w-[1440px] flex-col items-stretch lg:flex-row lg:items-start">

        {/* Left sidebar — sticky within the 1440px container */}
        {showLeftSidebar && <Sidebar />}

        {/* Center + Right — fills remaining space */}
        <div
          className={cn(
            "flex w-full min-w-0 flex-1 items-start gap-4 overflow-x-hidden px-4 pb-24 pt-2 sm:px-5 md:pt-3 lg:w-auto lg:gap-6 lg:pr-0 lg:pb-8 lg:pt-0",
            showLeftSidebar && (showRightSidebar ? "lg:pl-6" : "lg:pl-3"),
            showRightSidebar && !fullWidth && "lg:-mt-6"
          )}
        >

          {/* Main feed */}
          <main className={cn(
            "w-full min-w-0 mx-auto",
            fullWidth
              ? "flex-1"
              : showRightSidebar
                ? "flex-shrink-0 lg:max-w-[480px] xl:max-w-[640px]"
                : "max-w-[680px] mx-auto flex-shrink-0"
          )}>
            {children}
          </main>

          {/* Right sidebar — sticky flex item
              self-start + sticky top-14: canonical sticky sidebar pattern in flexbox
              flex-1: fills all remaining horizontal space
              h-[calc(100vh-3.5rem)]: fills viewport below topbar, scrolls internally */}
          {showRightSidebar && (
            <div className="hidden lg:block flex-1 min-w-0 sticky top-[64px] self-start lg:-translate-y-6">
              <div className="pr-6">
                <RightSidebar />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  )
}
