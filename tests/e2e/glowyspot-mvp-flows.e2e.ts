import { expect, test, type Page } from "@playwright/test"
import path from "path"

import { signInWithEmail, signOut } from "./utils/auth"
import {
  cleanupMvpRuntimeData,
  mvpTestUsers,
  readMvpFixtures,
  type MvpFixtures,
} from "./utils/mvp-fixtures"

let fixtures: MvpFixtures

test.beforeAll(async () => {
  fixtures = await readMvpFixtures()
})

test.afterAll(async () => {
  await cleanupMvpRuntimeData()
})

test.beforeEach(async ({ page }) => {
  await signOut(page)
})

test.describe.serial("GlowySpot critical MVP flows", () => {
  test("creates a booking request, provider accepts it, and visitor sees the accepted status", async ({ page }) => {
    const bookingDate = getFutureDateInputValue()

    await signInWithEmail(page, mvpTestUsers.visitor)
    await gotoApp(page, `/profile/${fixtures.salonSlug}`)
    await page.getByTestId(`book-service-${fixtures.serviceId}`).click()
    await expect(page.getByTestId("booking-submit")).toBeVisible()
    await page.getByTestId("booking-service-select").selectOption(fixtures.serviceId)
    await page.getByTestId("booking-date-input").fill(bookingDate)
    await page.getByTestId("booking-time-input").fill("10:30")
    await page.getByTestId("booking-submit").click()

    await gotoApp(page, "/dashboard/bookings")
    await expect(page.getByTestId(/^visitor-booking-/).first()).toContainText("E2E MVP Arckezelés")
    await expect(page.getByText(/Függőben|FÃ¼ggÅ‘ben/).first()).toBeVisible()

    await signInWithEmail(page, mvpTestUsers.provider)
    await gotoApp(page, `/dashboard/salons/${fixtures.salonId}/bookings`)
    const providerBooking = page.getByTestId(/^provider-booking-/).first()
    await expect(providerBooking).toContainText("E2E Visitor")
    await expect(providerBooking).toContainText("E2E MVP Arckezelés")

    await page.locator('[data-testid^="accept-booking-"]').first().click()
    await expect(page.locator('[data-testid^="accept-booking-"]')).toHaveCount(0)
    await expect(page.getByText(/Elfogadva|confirmed/i).first()).toBeVisible()

    await signInWithEmail(page, mvpTestUsers.visitor)
    await gotoApp(page, "/dashboard/bookings")
    await expect(page.getByTestId(/^visitor-booking-/).first()).toContainText("E2E MVP Arckezelés")
    await expect(page.getByText(/Elfogadva|confirmed/i).first()).toBeVisible()
  })

  test("keeps salon-scoped messages filtered and supports provider reply", async ({ page }) => {
    const visitorMessage = `E2E visitor message ${Date.now()}`
    const providerReply = `E2E provider reply ${Date.now()}`

    await signInWithEmail(page, mvpTestUsers.visitor)
    await gotoApp(page, `/profile/${fixtures.salonSlug}`)
    await page.getByTestId("public-salon-message-button").click()
    await page.getByTestId("public-message-content").fill(visitorMessage)
    const alert = page.waitForEvent("dialog")
    await page.getByTestId("public-message-submit").click()
    await (await alert).accept()

    await signInWithEmail(page, mvpTestUsers.provider)
    await gotoApp(page, `/dashboard/salons/${fixtures.salonId}/messages`)
    await expect(page).toHaveURL(new RegExp(`/dashboard/messages\\?salon=${fixtures.salonId}`))
    await expect(page.getByTestId("message-bubble").filter({ hasText: visitorMessage })).toBeVisible()

    await page.getByTestId("message-reply-input").fill(providerReply)
    await page.getByTestId("message-reply-submit").click()
    await expect(page.getByTestId("message-bubble").filter({ hasText: providerReply })).toBeVisible()

    await signInWithEmail(page, mvpTestUsers.visitor)
    await gotoApp(page, `/dashboard/messages?salon=${fixtures.salonId}`)
    await expect(page.getByTestId("message-bubble").filter({ hasText: providerReply })).toBeVisible()
  })

  test("optionally uploads a portfolio image when external moderation is enabled", async ({ page }) => {
    test.skip(
      process.env.E2E_ENABLE_UPLOAD_FLOW !== "true",
      "Upload e2e is opt-in because the API uses fail-closed external AI moderation.",
    )

    const postContent = `E2E: portfolio upload ${Date.now()}`
    const imagePath = path.join(process.cwd(), "tests/e2e/assets/e2e-beauty-upload.png")

    await signInWithEmail(page, mvpTestUsers.provider)
    await gotoApp(page, `/dashboard/salons/${fixtures.salonId}/portfolio`)
    await page.getByTestId("portfolio-add-post").click()
    await page.getByTestId("portfolio-post-content").fill(postContent)
    await page.getByTestId("portfolio-image-input").setInputFiles(imagePath)
    await page.getByTestId("portfolio-post-submit").click()
    await expect(page.getByTestId("portfolio-post-card").filter({ hasText: postContent })).toBeVisible({
      timeout: 45_000,
    })
  })
})

async function gotoApp(page: Page, pathName: string) {
  try {
    await page.goto(pathName, { waitUntil: "domcontentloaded" })
  } catch (error) {
    if (!String(error).includes("net::ERR_ABORTED")) throw error
    await page.goto(pathName, { waitUntil: "domcontentloaded" })
  }
}

function getFutureDateInputValue() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}
