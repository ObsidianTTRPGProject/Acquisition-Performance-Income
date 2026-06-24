import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, Badge, statusColor } from '../components/ui'
import PropertyMap from '../components/PropertyMap'

export default function MapView() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState('all')
  const [postcode, setPostcode] = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('properties')
      .select('id, nickname, address, suburb, state, postcode, status, latitude, longitude')
      .order('nickname')
    setProperties(data || [])
    setLoading(false)
  }

  const states = [...new Set(properties.map((p) => p.state).filter(Boolean))].sort()
  const filtered = properties.filter((p) => {
    if (stateFilter !== 'all' && p.state !== stateFilter) return false
    if (postcode.trim() && String(p.postcode || '') !== postcode.trim()) return false
    return true
  })
  const located = filtered.filter((p) => p.latitude && p.longitude)
  const markers = located.map((p) => ({
    lat: Number(p.latitude),
    lng: Number(p.longitude),
    label: `<strong>${p.nickname}</strong><br/>${[p.suburb, p.state, p.postcode].filter(Boolean).join(', ')}`,
    onClick: () => navigate(`/properties/${p.id}`),
  }))

  if (loading) return <p className="text-slate-400">Loading…</p>

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Property Map</h1>
          <p className="text-sm text-slate-500">{located.length} of {filtered.length} shown have a map location</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="all">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
        </div>
      </div>

      <Card className="mb-6 overflow-hidden p-0">
        <PropertyMap markers={markers} height={460} />
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="cursor-pointer p-4 hover:shadow-md" onClick={() => navigate(`/properties/${p.id}`)}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{p.nickname}</h3>
              <Badge color={statusColor(p.status)}>{p.status}</Badge>
            </div>
            <p className="text-sm text-slate-500">{[p.suburb, p.state, p.postcode].filter(Boolean).join(', ') || p.address || 'No location'}</p>
            {!p.latitude && <p className="mt-1 text-xs text-amber-600">No map pin — set the address to locate it</p>}
          </Card>
        ))}
      </div>
    </div>
  )
}
