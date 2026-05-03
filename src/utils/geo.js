const R = 6371

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export const formatDistance = km => km < 1 ? `${Math.round(km*1000)} m` : `${km.toFixed(1)} km`

export function filterBranchesByRadius(branches, lat, lng, radiusKm) {
  return branches
    .map(b => ({ ...b, distanceKm: haversineDistance(lat, lng, b.lat, b.lng) }))
    .filter(b => b.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Rentizo/1.0' }
    })
    const data = await res.json()
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
}

export async function forwardGeocode(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Rentizo/1.0' }
    })
    const results = await res.json()
    if (!results.length) return null
    const { lat, lon, display_name } = results[0]
    return { lat: parseFloat(lat), lng: parseFloat(lon), displayName: display_name }
  } catch { return null }
}

export function getCurrentPosition() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    )
  })
}

export const DEFAULT_LOCATION = { lat: 19.076, lng: 72.8777 }
