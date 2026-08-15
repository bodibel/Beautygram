import { describe, expect, it } from "vitest"

import { PUBLIC_SALON_WHERE, isSalonPubliclyVisible } from "../../lib/salon-visibility"

describe("PUBLIC_SALON_WHERE", () => {
    it("mindhárom láthatósági feltételt tartalmazza", () => {
        expect(PUBLIC_SALON_WHERE).toEqual({
            isActive: true,
            isPublished: true,
            publishBlockedReason: null,
        })
    })
})

describe("isSalonPubliclyVisible", () => {
    it("látható, ha aktív, publikált és nincs tiltás", () => {
        expect(isSalonPubliclyVisible({
            isActive: true,
            isPublished: true,
            publishBlockedReason: null,
        })).toBe(true)
    })

    it.each([
        ["a tulajdonos fiókja inaktív", { isActive: false, isPublished: true, publishBlockedReason: null }],
        ["nincs publikálva", { isActive: true, isPublished: false, publishBlockedReason: null }],
        ["előfizetés miatt tiltva", { isActive: true, isPublished: true, publishBlockedReason: "BILLING" }],
        ["admin által tiltva", { isActive: true, isPublished: true, publishBlockedReason: "ADMIN" }],
    ])("rejtett, ha %s", (_leiras, salon) => {
        expect(isSalonPubliclyVisible(salon)).toBe(false)
    })

    it("rejtett, ha egyszerre több feltétel is sérül", () => {
        expect(isSalonPubliclyVisible({
            isActive: false,
            isPublished: false,
            publishBlockedReason: "BILLING",
        })).toBe(false)
    })
})
