import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

const testPassword = process.env.E2E_TEST_PASSWORD ?? "password123"

export const testUsers = {
  visitor: "visitor1@glowyspot.com",
  provider: "provider1@glowyspot.com",
  otherProvider: "provider2@glowyspot.com",
  singleProvider: "single_provider@glowyspot.com",
  admin: "admin@glowyspot.com",
} as const

export type TestUserRole = keyof typeof testUsers

export async function signOut(page: Page) {
  await page.context().clearCookies()
}

export async function signInAs(page: Page, role: TestUserRole) {
  await signInWithEmail(page, testUsers[role])
}

export async function signInWithEmail(page: Page, email: string) {
  await signOut(page)

  const response = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: await getCsrfToken(page),
      email,
      password: testPassword,
      json: "true",
      redirect: "false",
    },
  })

  expect(response.ok(), `credentials login failed for ${email}`).toBe(true)
}

async function getCsrfToken(page: Page) {
  const response = await page.request.get("/api/auth/csrf")
  expect(response.ok(), "csrf endpoint should respond").toBe(true)

  const body = (await response.json()) as { csrfToken?: string }
  expect(body.csrfToken, "csrf token should exist").toBeTruthy()

  return body.csrfToken!
}
