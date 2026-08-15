export interface GeoPoint {
  lat: number
  lng: number
}

interface GeoPointCandidate {
  lat?: number | null
  lng?: number | null
}

export function isValidGeoPoint(point?: GeoPointCandidate | null): point is GeoPoint {
  return (
    typeof point?.lat === "number" &&
    typeof point?.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  )
}

export function getDistanceKm(from: GeoPoint, to: GeoPoint) {
  const earthRadiusKm = 6371
  const latDelta = toRadians(to.lat - from.lat)
  const lngDelta = toRadians(to.lng - from.lng)
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function isWithinRadiusKm(from: GeoPoint, to: GeoPoint, radiusKm: number) {
  if (!Number.isFinite(radiusKm) || radiusKm < 0) return false
  return getDistanceKm(from, to) <= radiusKm
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}
