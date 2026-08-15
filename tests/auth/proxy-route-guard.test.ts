import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
    getToken: vi.fn(),
}))

vi.mock("next-auth/jwt", () => ({
    getToken: mocks.getToken,
}))

import { proxy } from "../../proxy"

function request(path: string) {
    return new NextRequest(`http://localhost:3000${path}`)
}

describe("proxy route guard smoke matrix", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // Mocked proxy coverage only: authenticated browser/session behavior still belongs in Playwright e2e.
    it("redirects logged-out users from dashboard routes", async () => {
        mocks.getToken.mockResolvedValue(null)

        const response = await proxy(request("/dashboard"))

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/?authRequired=true")
    })

    it("allows visitors to access the base dashboard", async () => {
        mocks.getToken.mockResolvedValue({ role: "visitor" })

        const response = await proxy(request("/dashboard"))

        expect(response.status).toBe(200)
    })

    it("redirects non-admins from admin routes", async () => {
        mocks.getToken.mockResolvedValue({ role: "visitor" })

        const response = await proxy(request("/dashboard/admin/overview"))

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard?forbidden=true")
    })

    it("allows admins on admin routes", async () => {
        mocks.getToken.mockResolvedValue({ role: "admin" })

        const response = await proxy(request("/dashboard/admin/overview"))

        expect(response.status).toBe(200)
    })

    it("allows providers and admins through the salon console proxy gate", async () => {
        mocks.getToken.mockResolvedValueOnce({ role: "provider" })
        expect((await proxy(request("/salon/salon-1"))).status).toBe(200)

        mocks.getToken.mockResolvedValueOnce({ role: "admin" })
        expect((await proxy(request("/salon/salon-1"))).status).toBe(200)
    })

    it("redirects visitors from salon console routes", async () => {
        mocks.getToken.mockResolvedValue({ role: "visitor" })

        const response = await proxy(request("/salon/salon-1"))

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard?forbidden=true")
    })
})
