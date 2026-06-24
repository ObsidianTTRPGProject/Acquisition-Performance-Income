import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, Button, Field, Input, Select } from '../components/ui'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(blank())
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function blank() {
    return { name: '', company: '', role: 'builder', phone: '', email: '', notes: '' }
  }

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('contacts').select('*').order('name')
    setContacts(data || [])
  }

  async function add() {
    if (!form.name.trim()) return
    await supabase.from('contacts').insert(form)
    setForm(blank()); setAdding(false); load()
  }

  async function remove(id) {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id); load()
  }

  const filtered = contacts.filter((c) =>
    [c.name, c.company, c.role].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ New contact'}</Button>
      </div>

      {adding && (
        <Card className="mb-5 space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *"><Input value={form.name} onChange={set('name')} /></Field>
            <Field label="Company"><Input value={form.company} onChange={set('company')} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Role">
              <Select value={form.role} onChange={set('role')}>
                {['builder', 'plumber', 'electrician', 'agent', 'accountant', 'other'].map((r) => <option key={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Email"><Input value={form.email} onChange={set('email')} /></Field>
          </div>
          <Button onClick={add}>Add contact</Button>
        </Card>
      )}

      <div className="mb-4">
        <Input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-400">No contacts.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">{c.name}</h3>
                <button onClick={() => remove(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
              <p className="text-sm text-slate-500">{[c.role, c.company].filter(Boolean).join(' · ')}</p>
              <p className="mt-2 text-sm text-slate-600">{c.phone}</p>
              <p className="text-sm text-slate-600">{c.email}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
