import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet's default marker images break under bundlers, so point them at the CDN.
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// markers: [{ lat, lng, label?, onClick? }]
export default function PropertyMap({ markers = [], height = 320, zoom = 14 }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (!elRef.current) return
    if (!mapRef.current) {
      mapRef.current = L.map(elRef.current, { scrollWheelZoom: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
      layerRef.current = L.layerGroup().addTo(mapRef.current)
    }
    const map = mapRef.current
    layerRef.current.clearLayers()

    const pts = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
    if (pts.length === 0) {
      map.setView([-25.27, 133.77], 4) // whole of Australia
    } else {
      pts.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon }).addTo(layerRef.current)
        if (p.label) m.bindPopup(p.label)
        if (p.onClick) m.on('click', p.onClick)
      })
      if (pts.length === 1) {
        map.setView([pts[0].lat, pts[0].lng], zoom)
      } else {
        map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.2))
      }
    }
    // Ensure tiles render once the container has its real size (tabs, grid, etc.).
    const timers = [0, 150, 400, 800].map((d) => setTimeout(() => map.invalidateSize(), d))
    return () => timers.forEach(clearTimeout)
  }, [JSON.stringify(markers), zoom])

  // Recalculate when the container element changes size.
  useEffect(() => {
    if (!elRef.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { if (mapRef.current) mapRef.current.invalidateSize() })
    ro.observe(elRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }, [])

  return <div ref={elRef} style={{ height }} className="w-full overflow-hidden rounded-lg border border-slate-200" />
}
