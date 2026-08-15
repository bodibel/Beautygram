import { expect, test, type Page } from "@playwright/test"

import { readSmokeFixtures, type SmokeFixtures } from "./utils/fixtures"
import { signInAs, signOut } from "./utils/auth"

let fixtures: SmokeFixtures

test.beforeAll(async () => {
  fixtures = await readSmokeFixtures()
})

test.beforeEach(async ({ page }) => {
  await signOut(page)
})

test.describe("GlowySpot MVP route smoke", () => {
  test("redirects logged-out users from protected dashboard and salon routes", async ({ page }) => {
    await gotoSmokeRoute(page, "/dashboard")
    await expect(page).toHaveURL(/\/\?authRequired=true/)

    await gotoSmokeRoute(page, "/dashboard/admin/overview")
    await expect(page).toHaveURL(/\/\?authRequired=true/)

    await gotoSmokeRoute(page, `/dashboard/salons/${fixtures.providerSalonId}`)
    await expect(page).toHaveURL(/\/\?authRequired=true/)
  })

  test("allows visitor dashboard routes and blocks admin and salon console access", async ({ page }) => {
    await signInAs(page, "visitor")

    await gotoSmokeRoute(page, "/dashboard")
    await expect(page.getByRole("heading", { name: "Szia, Teszt Látogató!" })).toBeVisible()

    await gotoSmokeRoute(page, "/dashboard/admin/overview")
    await expect(page).toHaveURL(/\/dashboard\?forbidden=true/)

    await gotoSmokeRoute(page, `/dashboard/salons/${fixtures.providerSalonId}`)
    await expect(page).toHaveURL(/\/dashboard\/salons/)
    await expect(page).not.toHaveURL(new RegExp(`/dashboard/salons/${fixtures.providerSalonId}$`))
  })

  test("allows provider dashboard and new dashboard salon console routes", async ({ page }) => {
    await signInAs(page, "provider")

    await gotoSmokeRoute(page, "/dashboard/provider")
    await expect(page.getByRole("heading", { name: "Szalonkezelés egy helyen" })).toBeVisible()

    await gotoSmokeRoute(page, "/dashboard/salons")
    await expect(page.getByRole("heading", { name: "Szalonjaim" })).toBeVisible()

    const routeExpectations = [
      ["", "szalonkezelő"],
      ["/bookings", "Foglalási"],
      ["/profile", "Profil"],
      ["/services", "Szolgáltatások"],
      ["/portfolio", "Portfólió"],
      ["/hours", "Nyitvatartás"],
      ["/team", "Csapat"],
    ] as const

    for (const [suffix, expectedText] of routeExpectations) {
      await gotoSmokeRoute(page, `/dashboard/salons/${fixtures.providerSalonId}${suffix}`)
      await expect(page).toHaveURL(new RegExp(`/dashboard/salons/${fixtures.providerSalonId}${escapeRegExp(suffix)}$`))
      await expectVisibleText(page, expectedText)
      await expect(page.getByText("Upcoming Schedule")).toHaveCount(0)
    }
  })

  test("keeps legacy salon console routes compatible for the owner provider", async ({ page }) => {
    await signInAs(page, "provider")

    const routeExpectations = [
      ["", "szalonkezelő"],
      ["/bookings", "Foglalási"],
      ["/settings", "Profil"],
      ["/services", "Szolgáltatások"],
      ["/posts", "Portfólió"],
      ["/hours", "Nyitvatartás"],
      ["/team", "Csapat"],
    ] as const

    for (const [suffix, expectedText] of routeExpectations) {
      await gotoSmokeRoute(page, `/salon/${fixtures.providerSalonId}${suffix}`)
      await expect(page).toHaveURL(new RegExp(`/salon/${fixtures.providerSalonId}${escapeRegExp(suffix)}$`))
      await expectVisibleText(page, expectedText)
    }
  })

  test("keeps salon scoped messages on the existing messages module", async ({ page }) => {
    await signInAs(page, "provider")

    await gotoSmokeRoute(page, `/dashboard/salons/${fixtures.providerSalonId}/messages`)
    await expect(page).toHaveURL(new RegExp(`/dashboard/messages\\?salon=${fixtures.providerSalonId}`))
    await expect(page.getByRole("heading", { name: "Üzenetek" })).toBeVisible()

    await gotoSmokeRoute(page, "/dashboard/messages")
    await expect(page.getByRole("heading", { name: "Üzenetek" })).toBeVisible()
  })

  test("allows admin dashboard but does not grant implicit salon console ownership", async ({ page }) => {
    await signInAs(page, "admin")

    await gotoSmokeRoute(page, "/dashboard/admin/overview")
    await expect(page).toHaveURL(/\/dashboard\/admin\/overview/)

    await gotoSmokeRoute(page, `/dashboard/salons/${fixtures.providerSalonId}`)
    await expect(page).toHaveURL(/\/dashboard\/salons/)
    await expect(page).not.toHaveURL(new RegExp(`/dashboard/salons/${fixtures.providerSalonId}$`))
  })

  test("blocks a provider from another provider's salon console", async ({ page }) => {
    await signInAs(page, "provider")

    await gotoSmokeRoute(page, `/dashboard/salons/${fixtures.otherProviderSalonId}`)
    await expect(page).toHaveURL(/\/dashboard\/salons/)
    await expect(page).not.toHaveURL(new RegExp(`/dashboard/salons/${fixtures.otherProviderSalonId}$`))
  })
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function gotoSmokeRoute(page: Page, path: string) {
  try {
    await page.goto(path, { waitUntil: "domcontentloaded" })
  } catch (error) {
    if (!String(error).includes("net::ERR_ABORTED")) throw error
    await page.goto(path, { waitUntil: "domcontentloaded" })
  }
}

async function expectVisibleText(page: Page, text: string) {
  const matches = page.getByText(text)
  await expect(matches, `expected at least one visible "${text}" match`).not.toHaveCount(0)

  const count = await matches.count()
  for (let index = 0; index < count; index += 1) {
    if (await matches.nth(index).isVisible()) return
  }

  throw new Error(`No visible match found for "${text}".`)
}
