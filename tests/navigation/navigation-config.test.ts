import { describe, expect, it } from "vitest"

import {
    getDashboardSalonHref,
    getDashboardSalonLinks,
    getLegacySalonConsoleHref,
    getNavLinks,
    isNavActive,
} from "../../lib/navigation-config"

describe("dashboard navigation config", () => {
    it("keeps exact dashboard overview matching", () => {
        expect(isNavActive("/dashboard", { href: "/dashboard", match: "exact" })).toBe(true)
        expect(isNavActive("/dashboard/bookings", { href: "/dashboard", match: "exact" })).toBe(false)
    })

    it("keeps provider and salon routes prefix matched", () => {
        expect(isNavActive("/dashboard/provider", { href: "/dashboard/provider", match: "prefix" })).toBe(true)
        expect(isNavActive("/dashboard/provider/settings", { href: "/dashboard/provider", match: "prefix" })).toBe(true)
        expect(isNavActive("/dashboard/salons/123", { href: "/dashboard/salons", match: "prefix" })).toBe(true)
    })

    it("keeps admin overview exact", () => {
        expect(isNavActive("/dashboard/admin/overview", { href: "/dashboard/admin/overview", match: "exact" })).toBe(true)
        expect(isNavActive("/dashboard/admin/overview/stats", { href: "/dashboard/admin/overview", match: "exact" })).toBe(false)
    })

    it("separates visitor and provider dashboard navigation", () => {
        const visitorHrefs = getNavLinks("visitor", false, undefined, true).map((item) => item.href)
        const providerHrefs = getNavLinks("provider", false, undefined, true).map((item) => item.href)

        expect(visitorHrefs).toContain("/dashboard")
        expect(visitorHrefs).toContain("/dashboard/account")
        expect(visitorHrefs).not.toContain("/dashboard/provider")
        expect(providerHrefs).toContain("/dashboard/provider")
        expect(providerHrefs).toContain("/dashboard/salons")
    })

    it("generates dashboard salon alias URLs without changing legacy console URLs", () => {
        expect(getDashboardSalonHref("salon-1")).toBe("/dashboard/salons/salon-1")
        expect(getDashboardSalonHref("salon-1", "bookings")).toBe("/dashboard/salons/salon-1/bookings")
        expect(getDashboardSalonHref("salon-1", "profile")).toBe("/dashboard/salons/salon-1/profile")
        expect(getDashboardSalonHref("salon-1", "portfolio")).toBe("/dashboard/salons/salon-1/portfolio")
        expect(getDashboardSalonHref("salon-1", "messages")).toBe("/dashboard/salons/salon-1/messages")

        expect(getLegacySalonConsoleHref("salon-1")).toBe("/salon/salon-1")
        expect(getLegacySalonConsoleHref("salon-1", "profile")).toBe("/salon/salon-1/settings")
        expect(getLegacySalonConsoleHref("salon-1", "portfolio")).toBe("/salon/salon-1/posts")
        expect(getLegacySalonConsoleHref("salon-1", "messages")).toBe("/dashboard/messages?salon=salon-1")
    })

    it("prepares salon console nav links under dashboard aliases", () => {
        const hrefs = getDashboardSalonLinks("salon-1").map((item) => item.href)

        expect(hrefs).toEqual([
            "/dashboard/salons/salon-1",
            "/dashboard/salons/salon-1/bookings",
            "/dashboard/salons/salon-1/profile",
            "/dashboard/salons/salon-1/services",
            "/dashboard/salons/salon-1/portfolio",
            "/dashboard/salons/salon-1/hours",
            "/dashboard/salons/salon-1/team",
            "/dashboard/salons/salon-1/messages",
        ])
    })

    it("keeps dashboard salon overview exact and subpages prefix active", () => {
        const links = getDashboardSalonLinks("salon-1")
        const overview = links.find((item) => item.href === "/dashboard/salons/salon-1")
        const bookings = links.find((item) => item.href === "/dashboard/salons/salon-1/bookings")
        const profile = links.find((item) => item.href === "/dashboard/salons/salon-1/profile")
        const services = links.find((item) => item.href === "/dashboard/salons/salon-1/services")
        const hours = links.find((item) => item.href === "/dashboard/salons/salon-1/hours")
        const portfolio = links.find((item) => item.href === "/dashboard/salons/salon-1/portfolio")
        const team = links.find((item) => item.href === "/dashboard/salons/salon-1/team")

        expect(isNavActive("/dashboard/salons/salon-1", overview!)).toBe(true)
        expect(isNavActive("/dashboard/salons/salon-1/bookings", overview!)).toBe(false)
        expect(isNavActive("/dashboard/salons/salon-1/bookings", bookings!)).toBe(true)
        expect(isNavActive("/dashboard/salons/salon-1/bookings/history", bookings!)).toBe(true)
        expect(isNavActive("/dashboard/salons/salon-1/profile", profile!)).toBe(true)
        expect(isNavActive("/dashboard/salons/salon-1/services", services!)).toBe(true)
        expect(isNavActive("/dashboard/salons/salon-1/hours", hours!)).toBe(true)
        expect(isNavActive("/dashboard/salons/salon-1/portfolio", portfolio!)).toBe(true)
        expect(isNavActive("/dashboard/salons/salon-1/team", team!)).toBe(true)
    })
})
