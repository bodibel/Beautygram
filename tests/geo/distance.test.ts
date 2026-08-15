import { describe, expect, it } from "vitest"

import { getDistanceKm, isValidGeoPoint, isWithinRadiusKm } from "../../lib/geo/distance"

describe("geo distance helpers", () => {
  it("validates finite coordinates", () => {
    expect(isValidGeoPoint({ lat: 47.4979, lng: 19.0402 })).toBe(true)
    expect(isValidGeoPoint({ lat: Number.NaN, lng: 19.0402 })).toBe(false)
    expect(isValidGeoPoint({ lat: 47.4979 })).toBe(false)
  })

  it("calculates approximate distance in kilometers", () => {
    const budapest = { lat: 47.4979, lng: 19.0402 }
    const szeged = { lat: 46.253, lng: 20.1414 }

    expect(getDistanceKm(budapest, szeged)).toBeGreaterThan(150)
    expect(getDistanceKm(budapest, szeged)).toBeLessThan(180)
  })

  it("checks radius matches", () => {
    const budapest = { lat: 47.4979, lng: 19.0402 }
    const nearby = { lat: 47.5001, lng: 19.045 }

    expect(isWithinRadiusKm(budapest, nearby, 1)).toBe(true)
    expect(isWithinRadiusKm(budapest, nearby, -1)).toBe(false)
  })
})
