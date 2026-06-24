// Address lookup via OpenStreetMap's free Nominatim service.
// No API key required. Please be considerate of their usage policy
// (max ~1 request/second) — the autocomplete debounces requests for this.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM = 'https://nominatim.openstreetmap.org'

// Default to Australian results; change/remove countrycodes to broaden.
const COUNTRY = 'au'

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) return []
  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6` +
    (COUNTRY ? `&countrycodes=${COUNTRY}` : '') +
    `&q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    return data.map(parseResult)
  } catch {
    return []
  }
}

function parseResult(r) {
  const a = r.address || {}
  const street = [a.house_number, a.road].filter(Boolean).join(' ')
  const suburb = a.suburb || a.neighbourhood || a.city || a.town || a.village || a.hamlet || a.municipality || ''
  return {
    formatted_address: r.display_name,
    street,
    suburb,
    state: a.state || '',
    postcode: a.postcode || '',
    country: a.country || '',
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    osm_place_id: String(r.place_id || ''),
  }
}
