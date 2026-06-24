import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Card, Button, Field, Input, Select, Textarea, Badge } from '../ui'
import { dateStr } from '../../lib/format'

const STATUSES = ['new', 'acknowledged', 'in progress', 'resolved', 'closed']
const PRIORITIES = ['low', 'medium', 'high']

export default function RequestsTab({ propertyId }) {
  const [requests, setRequests] = useState([])
  const [tenants, setTenants] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blank())
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function blank() { return { title: '', description: '', priority: 'medium', tenant_id: '' } }

  useEffect(() => { load() }, [propertyId])

  async function load() {
    const { data } = await supabase.from('requests').select('*').eq('property_id', propertyId).order('raised_on', { ascending: false })
    setRequests(data || [])
    const { data: tn } = await supabase.from('tenancies').select('id').eq('property_id', propertyId)
    const ids = (tn || []).map((t) => t.id)
    if (ids.length) {
      const { data: te } = await supabase.from('tenants').select('id, name').in('tenancy_id', ids)
      setTenants(te || [])
    } else setTenants([])
  }

  function startAdd() { setForm(blank()); setEditingId(null); setShowForm(true) }
  function startEdit(r) {
    setForm({ title: r.title || '', description: r.description || '', priority: r.priority || 'medium', tenant_id: r.tenant_id || '' })
    setEditingId(r.id); setShowForm(true)
  }

  async function save() {
    if (!form.title.trim()) return
    const payload = { ...form, property_id: propertyId, tenant_id: form.tenant_id || null }
    if (editingId) await supabase.from('requests').update(payload).eq('id', editingId)
    else await supabase.from('requests').insert(payload)
    setForm(blank()); setEditingId(null); setShowForm(false); load()
  }

  async function setStatus(r, status) { await supabase.from('requests').update({ status }).eq('id', r.id); load() }

  async function del(r) {
    if (!confirm(`Delete request "${r.title}"? This cannot be undone.`)) return
    await supabase.from('requests').delete().eq('id', r.id); load()
  }

  async function promote(r) {
    await supabase.from('tasks').insert({ property_id: propertyId, title: r.title, description: r.description, task_type: 'maintenance', priority: r.priority, status: 'open' })
    await supabase.from('requests').update({ status: 'in progress' }).eq('id', r.id)
    alert('Created a task from this request (see Tasks tab).'); load()
  }

  const tenantName = (id) => tenants.find((t) => t.id === id)?.name

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="font-medium">Tenant Requests</h2>
        <Button onClick={() => (showForm ? setShowForm(false) : startAdd())}>{showForm ? 'Close' : '+ New request'}</Button>
      </div>

      {showForm && (
        <Card className="mb-5 space-y-3 p-4">
          <h3 className="text-sm font-medium">{editingId ? 'Edit request' : 'New request'}</h3>
          <Field label="Title *"><Input value={form.title} onChange={set('title')} /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Raised by tenant">
              <Select value={form.tenant_id} onChange={set('tenant_id')}>
                <option value="">— unknown —</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Priority"><Select value={form.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>{editingId ? 'Save changes' : 'Add request'}</Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</Button>
          </div>
        </Card>
      )}

      {requests.length === 0 ? (
        <p className="text-slate-400">No requests logged.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{r.title}</h3>
                    <Badge color={r.priority === 'high' ? 'red' : r.priority === 'low' ? 'slate' : 'amber'}>{r.priority}</Badge>
                  </div>
                  {r.description && <p className="mt-1 text-sm text-slate-600">{r.description}</p>}
                  <p className="mt-2 text-xs text-slate-400">{tenantName(r.tenant_id) ? `By ${tenantName(r.tenant_id)}` : 'Tenant unknown'} · {dateStr(r.raised_on)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Select value={r.status} onChange={(e) => setStatus(r, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => startEdit(r)} className="text-brand-600 hover:underline">Edit</button>
                    <button onClick={() => promote(r)} className="text-brand-600 hover:underline">→ Task</button>
                    <button onClick={() => del(r)} className="text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
