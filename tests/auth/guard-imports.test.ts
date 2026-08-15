import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"

function read(path: string) {
    return readFileSync(path, "utf8")
}

describe("critical guard import wiring", () => {
    // Static import checks are intentionally simple. They do not replace DB fixture or Playwright route tests.
    it("keeps dashboard, salon console and upload route wired to the active-user helper", () => {
        expect(read("app/dashboard/layout.tsx")).toContain('from "@/lib/auth-utils"')
        expect(read("app/dashboard/layout.tsx")).toContain("getActiveSessionUser")

        expect(read("app/salon/[id]/layout.tsx")).toContain('from "@/lib/salon-console-auth"')
        expect(read("app/salon/[id]/layout.tsx")).toContain("requireSalonConsoleOwner")

        expect(read("app/dashboard/salons/[salonId]/layout.tsx")).toContain('from "@/lib/salon-console-auth"')
        expect(read("app/dashboard/salons/[salonId]/layout.tsx")).toContain("requireSalonConsoleOwner")

        expect(read("lib/salon-console-auth.ts")).toContain('from "@/lib/auth-utils"')
        expect(read("lib/salon-console-auth.ts")).toContain("getActiveSessionUser")

        expect(read("app/api/upload/route.ts")).toContain('from "@/lib/auth-utils"')
        expect(read("app/api/upload/route.ts")).toContain("getActiveSessionUser")
    })

    it("keeps admin and booking actions wired through auth-utils guards", () => {
        expect(read("lib/actions/user.ts")).toContain('from "@/lib/auth-utils"')
        expect(read("lib/actions/user.ts")).toContain("requireAdminSession")

        expect(read("lib/actions/category.ts")).toContain('from "@/lib/auth-utils"')
        expect(read("lib/actions/category.ts")).toContain("requireAdminSession")

        const salonActions = read("lib/actions/salon.ts")
        expect(salonActions).toContain('from "@/lib/auth-utils"')
        expect(salonActions).toContain("const sessionUserId = await requireSession()")
        expect(salonActions).toContain("async function updateOwnedBookingStatus")
    })

    it("keeps provider entry links wired to dashboard salon route helpers", () => {
        expect(read("app/dashboard/provider/page.tsx")).toContain("getDashboardSalonHref")
        expect(read("app/dashboard/salons/page.tsx")).toContain("getDashboardSalonHref")
        expect(read("components/dashboard/provider-dashboard.tsx")).toContain("getDashboardSalonHref")
        expect(read("components/dashboard/portfolio-vibe-widget.tsx")).toContain("getDashboardSalonHref")
        expect(read("components/layout/sidebar.tsx")).toContain("isDashboardSalonContext")
        expect(read("components/layout/bottom-nav.tsx")).toContain("getDashboardSalonBottomLinks")
    })

    it("keeps dashboard salon console layout free of the duplicated header block", () => {
        const salonLayout = read("app/dashboard/salons/[salonId]/layout.tsx")

        expect(salonLayout).toContain("requireSalonConsoleOwner")
        expect(salonLayout).not.toContain("SalonConsoleNav")
        expect(salonLayout).not.toContain("Szalonjaim")
        expect(salonLayout).not.toContain("lg:hidden")
    })

    it("keeps the sticky mobile salon nav off the new dashboard salon console routes", () => {
        const sidebar = read("components/layout/sidebar.tsx")
        const bottomNav = read("components/layout/bottom-nav.tsx")

        expect(sidebar).toContain("isLegacySalonContext && showNavLinks && navLinks")
        expect(sidebar).toContain("isDashboardSalonContext")
        expect(bottomNav).toContain("getDashboardSalonBottomLinks")
    })

    it("keeps the salon overview free of the demo upcoming schedule widget", () => {
        const overview = read("components/salon-console/salon-overview-content.tsx")

        expect(overview).not.toContain("TimelineSchedule")
        expect(overview).toContain("BookingRequests")
        expect(overview).toContain("PortfolioVibeWidget")
    })

    it("keeps dashboard sidebar separated from the public filter panel", () => {
        const sidebar = read("components/layout/sidebar.tsx")
        const mainLayout = read("components/layout/main-layout.tsx")

        expect(sidebar).toContain("showDashboardSidebar")
        expect(sidebar).toContain("Saját szalont szeretnél?")
        expect(sidebar).toContain("!showDashboardSidebar && showFilterPanel")
        expect(sidebar).toContain("fixed top-[5.5rem] bottom-0")
        expect(sidebar).toContain("h-[calc(100vh-5.5rem)]")
        expect(sidebar).toContain("lg:left-[max(2rem,calc((100vw-1440px)/2+2rem))]")
        expect(sidebar).toContain("flex h-full min-h-0 flex-col")
        expect(sidebar).toContain("order-last mt-auto border-t")
        expect(mainLayout).toContain('hidden w-[300px] flex-shrink-0 lg:block')
    })

    it("keeps dashboard top bar aligned to the main layout width", () => {
        expect(read("components/layout/top-bar.tsx")).toContain("max-w-[1440px]")
        expect(read("components/layout/main-layout.tsx")).toContain("max-w-[1440px]")
    })

    it("keeps primary dashboard pages on the shared top spacing rhythm", () => {
        const sharedWrapper = "mx-auto w-full max-w-6xl space-y-6 px-2 py-2 sm:px-0"

        for (const path of [
            "app/dashboard/page.tsx",
            "components/dashboard/account-profile-content.tsx",
            "app/dashboard/provider/page.tsx",
            "app/dashboard/salons/page.tsx",
            "app/dashboard/bookings/page.tsx",
            "app/dashboard/favorites/page.tsx",
        ]) {
            expect(read(path)).toContain(sharedWrapper)
        }

        expect(read("app/dashboard/messages/page.tsx")).toContain("mx-auto h-[calc(100vh-6rem)] w-full max-w-6xl px-2 py-2 sm:px-0")
        expect(read("app/dashboard/messages/page.tsx")).toContain("<MainLayout showRightSidebar={false} fullWidth>")
    })

    it("keeps light mode as the default theme", () => {
        const themeContext = read("lib/theme-context.tsx")
        const rootLayout = read("app/layout.tsx")

        expect(themeContext).toContain('theme: "light"')
        expect(themeContext).toContain('useState<Theme>("light")')
        expect(themeContext).toContain('return stored === "light" || stored === "dark" || stored === "system" ? stored : "light"')
        expect(rootLayout).toContain("var isDark = stored === 'dark';")
        expect(rootLayout).not.toContain("prefersDark")
    })

    it("keeps desktop interactive controls on pointer cursors", () => {
        const globals = read("app/globals.css")

        expect(globals).toContain('button:not(:disabled)')
        expect(globals).toContain('cursor: pointer')
        expect(globals).toContain('cursor: not-allowed')
    })

    it("keeps legacy profile route redirected to the canonical dashboard account page", () => {
        expect(read("app/profile/me/page.tsx")).toContain('redirect("/dashboard/account")')
        expect(read("app/dashboard/account/page.tsx")).toContain("AccountProfileContent")
        expect(read("app/dashboard/account/page.tsx")).not.toContain("@/app/profile/me/page")
        expect(read("components/layout/public-discovery-layout.tsx")).toContain('href="/dashboard/account"')
        expect(read("components/navigation/public-bottom-nav.tsx")).toContain('href: "/dashboard/account"')
    })

    it("keeps local quick profile login shortcuts in the auth modal", () => {
        const authModal = read("components/auth/auth-modal.tsx")

        expect(authModal).toContain("shouldShowQuickProfiles")
        expect(authModal).toContain('process.env.NODE_ENV !== "production"')
        expect(authModal).toContain("quickProfiles")
        expect(authModal).toContain("handleQuickProfileLogin")
        expect(authModal).toContain("visitor1@glowyspot.com")
        expect(authModal).toContain("provider1@glowyspot.com")
        expect(authModal).toContain("single_provider@glowyspot.com")
        expect(authModal).toContain("admin@glowyspot.com")
    })

    it("routes successful sign-ins to the account page by default", () => {
        const authModal = read("components/auth/auth-modal.tsx")

        expect(authModal).toContain('const postLoginHref = "/dashboard/account"')
        expect(authModal).toContain('signIn("google", { callbackUrl: postLoginHref })')
        expect(authModal).toContain("router.push(postLoginHref)")
        expect(authModal).not.toContain('callbackUrl: "/"')
    })

    it("keeps old and new salon profile, services and hours routes on shared content components", () => {
        const routeExpectations = [
            ["app/salon/[id]/settings/page.tsx", "SalonProfileContent"],
            ["app/dashboard/salons/[salonId]/profile/page.tsx", "SalonProfileContent"],
            ["app/salon/[id]/services/page.tsx", "SalonServicesContent"],
            ["app/dashboard/salons/[salonId]/services/page.tsx", "SalonServicesContent"],
            ["app/salon/[id]/hours/page.tsx", "SalonHoursContent"],
            ["app/dashboard/salons/[salonId]/hours/page.tsx", "SalonHoursContent"],
        ] as const

        for (const [path, componentName] of routeExpectations) {
            expect(read(path)).toContain(componentName)
        }
    })

    it("keeps old and new salon portfolio and team routes on shared content components", () => {
        const routeExpectations = [
            ["app/salon/[id]/posts/page.tsx", "SalonPortfolioContent"],
            ["app/dashboard/salons/[salonId]/portfolio/page.tsx", "SalonPortfolioContent"],
            ["app/salon/[id]/team/page.tsx", "SalonTeamContent"],
            ["app/dashboard/salons/[salonId]/team/page.tsx", "SalonTeamContent"],
        ] as const

        for (const [path, componentName] of routeExpectations) {
            expect(read(path)).toContain(componentName)
        }
    })

    it("keeps salon-scoped messages on the existing messages module", () => {
        expect(read("app/dashboard/salons/[salonId]/messages/page.tsx")).toContain("/dashboard/messages?salon=")
        expect(read("app/dashboard/messages/page.tsx")).toContain("useSearchParams")
        expect(read("app/dashboard/messages/page.tsx")).toContain("selectedSalonId")
        expect(read("app/dashboard/messages/page.tsx")).toContain("scopedMessages")
        expect(read("app/dashboard/messages/page.tsx")).toContain("Nincsenek szalonhoz kapcsolt üzenetek")
    })
})
