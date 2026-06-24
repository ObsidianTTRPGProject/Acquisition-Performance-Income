import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, Button, Badge, statusColor } from '../components/ui'
import { money } from '../lib/format'
import { signedUrl } from '../lib/storage'

export default function Dashboard() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    // Pull properties plus enough related data for the tile quick-stats.
    const { data: props } = await supabase.from('properties').select('*').order('created_at')
    const { data: openTasks } = await supabase.from('tasks').select('property_id').neq('status', 'resolved').neq('status', 'closed')
    const { data: tenancies } = await supabase.from('tenancies').select('property_id, rent_amount, move_out')

    const taskCount = {}
    ;(openTasks || []).forEach((t) => (taskCount[t.property_id] = (taskCount[t.property_id] || 0) + 1))
    const rent = {}
    ;(tenancies || []).forEach((t) => {
      if (!t.move_out) rent[t.property_id] = t.rent_amount
    })

    const withExtras = await Promise.all(
      (props || []).map(async (p) => ({
        ...p,
        openTasks: taskCount[p.id] || 0,
        weeklyRent: rent[p.id],
        coverUrl: p.cover_photo_path ? await signedUrl('property-photos', p.cover_photo_path) : null,
      }))
    )
    setProperties(withExtras)
    setLoading(false)
  }

  const totalRent = properties.reduce((s, p) => s + (Number(p.weeklyRent) || 0), 0)
  const totalOpen = properties.reduce((s, p) => s + p.openTasks, 0)

  const states = [...new Set(properties.map((p) => p.state).filter(Boolean))].sort()
  const filtered = properties.filter((p) => {
    if (stateFilter !== 'all' && p.state !== stateFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return [p.nickname, p.address, p.suburb, p.state, p.postcode]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    }
    return true
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Properties</h1>
          <p className="text-sm text-slate-500">
            {properties.length} properties · {money(totalRent)}/wk rent · {totalOpen} open tasks
          </p>
        </div>
        <Link to="/properties/new">
          <Button>+ Add Property</Button>
        </Link>
      </div>

      {!loading && properties.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          <input
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search by name, suburb, postcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="all">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : properties.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="mb-4 text-slate-500">No properties yet.</p>
          <Link to="/properties/new">
            <Button>Add your first property</Button>
          </Link>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">No properties match your filter.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} to={`/properties/${p.id}`}>
              <Card className="overflow-hidden transition hover:shadow-md">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt={p.nickname} className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-100 to-slate-100 text-4xl">
                    🏡
                  </div>
                )}
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">{p.nickname}</h3>
                    <Badge color={statusColor(p.status)}>{p.status}</Badge>
                  </div>
                  <p className="mb-3 truncate text-sm text-slate-500">{p.address || 'No address'}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{p.weeklyRent ? `${money(p.weeklyRent)}/wk` : 'Vacant'}</span>
                    <span className={p.openTasks ? 'text-amber-600' : 'text-slate-400'}>
                      {p.openTasks} open {p.openTasks === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
