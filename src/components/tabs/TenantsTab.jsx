import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Card, Button, Field, Input, Select, Textarea, Badge } from '../ui'
import { money, dateStr } from '../../lib/format'

export default function TenantsTab({ propertyId }) {
  const [tenancies, setTenancies] = useState([])
  const [tenants, setTenants] = useState({})
  const [payments, setPayments] = useState({})
  const [agreements, setAgreements] = useState({})
  const [logs, setLogs] = useState({})
  const [addingTenancy, setAddingTenancy] = useState(false)
  const [tForm, setTForm] = useState(blankTenancy())

  function blankTenancy() {
    return { move_in: '', rent_amount: '', rent_frequency: 'weekly', bond_amount: '', lease_start: '', lease_end: '' }
  }

  useEffect(() => { load() }, [propertyId])

  async function load() {
    const { data: tn } = await supabase.from('tenancies').select('*').eq('property_id', propertyId).order('move_in', { ascending: false })
    setTenancies(tn || [])
    const ids = (tn || []).map((t) => t.id)
    if (ids.length) {
      const { data: te } = await supabase.from('tenants').select('*').in('tenancy_id', ids)
      const { data: pay } = await supabase.from('rent_payments').select('*').in('tenancy_id', ids).order('due_date', { ascending: false })
      const { data: ag } = await supabase.from('catchup_agreements').select('*').in('tenancy_id', ids)
      const { data: lg } = await supabase.from('tenant_logs').select('*').in('tenancy_id', ids).order('created_at', { ascending: false })
      setTenants(group(te)); setPayments(group(pay)); setAgreements(group(ag)); setLogs(group(lg))
    } else { setTenants({}); setPayments({}); setAgreements({}); setLogs({}) }
  }

  function group(rows) {
    const m = {}
    ;(rows || []).forEach((r) => { (m[r.tenancy_id] = m[r.tenancy_id] || []).push(r) })
    return m
  }

  async function addTenancy() {
    if (!tForm.rent_amount) return
    await supabase.from('tenancies').insert({
      property_id: propertyId, ...tForm, rent_amount: Number(tForm.rent_amount),
      bond_amount: tForm.bond_amount ? Number(tForm.bond_amount) : null,
      move_in: tForm.move_in || null, lease_start: tForm.lease_start || null, lease_end: tForm.lease_end || null,
    })
    setTForm(blankTenancy()); setAddingTenancy(false); load()
  }

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="font-medium">Tenancies</h2>
        <Button onClick={() => setAddingTenancy(!addingTenancy)}>{addingTenancy ? 'Close' : '+ New tenancy'}</Button>
      </div>

      {addingTenancy && (
        <Card className="mb-5 space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Move-in date"><Input type="date" value={tForm.move_in} onChange={(e) => setTForm({ ...tForm, move_in: e.target.value })} /></Field>
            <Field label="Rent (AUD) *"><Input type="number" value={tForm.rent_amount} onChange={(e) => setTForm({ ...tForm, rent_amount: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <Select value={tForm.rent_frequency} onChange={(e) => setTForm({ ...tForm, rent_frequency: e.target.value })}>
                <option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option>
              </Select>
            </Field>
            <Field label="Bond (AUD)"><Input type="number" value={tForm.bond_amount} onChange={(e) => setTForm({ ...tForm, bond_amount: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lease start"><Input type="date" value={tForm.lease_start} onChange={(e) => setTForm({ ...tForm, lease_start: e.target.value })} /></Field>
            <Field label="Lease end"><Input type="date" value={tForm.lease_end} onChange={(e) => setTForm({ ...tForm, lease_end: e.target.value })} /></Field>
          </div>
          <Button onClick={addTenancy}>Create tenancy</Button>
        </Card>
      )}

      {tenancies.length === 0 ? (
        <p className="text-slate-400">No tenancies recorded.</p>
      ) : (
        <div className="space-y-5">
          {tenancies.map((tn) => (
            <Tenancy
              key={tn.id}
              tenancy={tn}
              tenants={tenants[tn.id] || []}
              payments={payments[tn.id] || []}
              agreements={agreements[tn.id] || []}
              logs={logs[tn.id] || []}
              onChange={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Tenancy({ tenancy, tenants, payments, agreements, logs, onChange }) {
  const [tab, setTab] = useState('tenants')
  const current = !tenancy.move_out

  async function endTenancy() {
    if (!confirm('Mark this tenancy as ended today?')) return
    await supabase.from('tenancies').update({ move_out: new Date().toISOString().slice(0, 10) }).eq('id', tenancy.id)
    onChange()
  }

  async function deleteTenancy() {
    if (!confirm('Delete this entire tenancy and all its tenants, payments, agreements and logs? This cannot be undone.')) return
    await supabase.from('tenancies').delete().eq('id', tenancy.id)
    onChange()
  }

  const arrears = payments.filter((p) => p.status === 'missed' || p.status === 'late').length

  const TABS = [['tenants', 'Tenants'], ['rent', 'Rent payments'], ['catch-up', 'Catch-up'], ['log', 'Log']]

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{money(tenancy.rent_amount)} / {tenancy.rent_frequency}</h3>
            {current ? <Badge color="green">Current</Badge> : <Badge color="slate">Past</Badge>}
            {arrears > 0 && <Badge color="red">{arrears} arrears</Badge>}
          </div>
          <p className="text-sm text-slate-500">
            {dateStr(tenancy.move_in)} → {tenancy.move_out ? dateStr(tenancy.move_out) : 'present'}
            {tenancy.bond_amount ? ` · Bond ${money(tenancy.bond_amount)}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {current && <Button variant="secondary" onClick={endTenancy}>End tenancy</Button>}
          <Button variant="danger" onClick={deleteTenancy}>Delete</Button>
        </div>
      </div>

      <div className="mb-3 flex gap-2 text-sm">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-1 ${tab === key ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'tenants' && <TenantList tenancyId={tenancy.id} tenants={tenants} onChange={onChange} />}
      {tab === 'rent' && <RentList tenancyId={tenancy.id} payments={payments} rent={tenancy.rent_amount} onChange={onChange} />}
      {tab === 'catch-up' && <AgreementList tenancyId={tenancy.id} agreements={agreements} onChange={onChange} />}
      {tab === 'log' && <LogList tenancyId={tenancy.id} logs={logs} onChange={onChange} />}
    </Card>
  )
}

function TenantList({ tenancyId, tenants, onChange }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', emergency_contact: '' })
  async function add() {
    if (!form.name.trim()) return
    await supabase.from('tenants').insert({ tenancy_id: tenancyId, ...form, is_primary: tenants.length === 0 })
    setForm({ name: '', phone: '', email: '', emergency_contact: '' }); onChange()
  }
  async function del(t) {
    if (!confirm(`Remove tenant "${t.name}"?`)) return
    await supabase.from('tenants').delete().eq('id', t.id); onChange()
  }
  return (
    <div className="space-y-2 text-sm">
      {tenants.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="font-medium">{t.name} {t.is_primary && <Badge color="blue">primary</Badge>}</span>
          <span className="flex items-center gap-3 text-slate-500">
            {[t.phone, t.email].filter(Boolean).join(' · ')}
            <button onClick={() => del(t)} className="text-xs text-red-500 hover:underline">Remove</button>
          </span>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Button onClick={add}>Add tenant</Button>
      </div>
    </div>
  )
}

function RentList({ tenancyId, payments, rent, onChange }) {
  const [form, setForm] = useState({ due_date: '', amount_due: rent || '', amount_paid: '', status: 'paid' })
  async function add() {
    if (!form.due_date) return
    await supabase.from('rent_payments').insert({
      tenancy_id: tenancyId, due_date: form.due_date, amount_due: Number(form.amount_due || rent || 0),
      amount_paid: Number(form.amount_paid || 0), status: form.status, paid_date: form.status === 'paid' ? form.due_date : null,
    })
    setForm({ due_date: '', amount_due: rent || '', amount_paid: '', status: 'paid' }); onChange()
  }
  async function setStatus(p, status) { await supabase.from('rent_payments').update({ status }).eq('id', p.id); onChange() }
  async function del(p) {
    if (!confirm('Delete this rent payment record?')) return
    await supabase.from('rent_payments').delete().eq('id', p.id); onChange()
  }
  return (
    <div className="space-y-2 text-sm">
      {payments.length === 0 && <p className="text-slate-400">No payments logged.</p>}
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span>{dateStr(p.due_date)} · {money(p.amount_paid)} / {money(p.amount_due)}</span>
          <span className="flex items-center gap-2">
            <Select value={p.status} onChange={(e) => setStatus(p, e.target.value)}>
              {['paid', 'late', 'missed', 'due'].map((s) => <option key={s}>{s}</option>)}
            </Select>
            <button onClick={() => del(p)} className="text-xs text-red-500 hover:underline">Delete</button>
          </span>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-5">
        <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        <Input type="number" placeholder="Due" value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: e.target.value })} />
        <Input type="number" placeholder="Paid" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {['paid', 'late', 'missed', 'due'].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Button onClick={add}>Log</Button>
      </div>
    </div>
  )
}

function AgreementList({ tenancyId, agreements, onChange }) {
  const [form, setForm] = useState({ total_owed: '', schedule: '', terms: '' })
  async function add() {
    if (!form.terms.trim() && !form.total_owed) return
    await supabase.from('catchup_agreements').insert({
      tenancy_id: tenancyId, total_owed: form.total_owed ? Number(form.total_owed) : null,
      schedule: form.schedule, terms: form.terms, status: 'active',
    })
    setForm({ total_owed: '', schedule: '', terms: '' }); onChange()
  }
  async function setStatus(a, status) { await supabase.from('catchup_agreements').update({ status }).eq('id', a.id); onChange() }
  async function del(a) {
    if (!confirm('Delete this catch-up agreement?')) return
    await supabase.from('catchup_agreements').delete().eq('id', a.id); onChange()
  }
  return (
    <div className="space-y-2 text-sm">
      {agreements.length === 0 && <p className="text-slate-400">No catch-up agreements.</p>}
      {agreements.map((a) => (
        <div key={a.id} className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{a.total_owed ? money(a.total_owed) : 'Agreement'} — {a.schedule}</span>
            <span className="flex items-center gap-2">
              <Select value={a.status} onChange={(e) => setStatus(a, e.target.value)}>
                {['active', 'completed', 'defaulted'].map((s) => <option key={s}>{s}</option>)}
              </Select>
              <button onClick={() => del(a)} className="text-xs text-red-500 hover:underline">Delete</button>
            </span>
          </div>
          {a.terms && <p className="mt-1 text-slate-500">{a.terms}</p>}
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
        <Input type="number" placeholder="Total owed" value={form.total_owed} onChange={(e) => setForm({ ...form, total_owed: e.target.value })} />
        <Input placeholder="Schedule e.g. $50/wk" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
        <Input placeholder="Terms / notes" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
        <Button onClick={add}>Add</Button>
      </div>
    </div>
  )
}

function LogList({ tenancyId, logs, onChange }) {
  const [note, setNote] = useState('')
  async function add() {
    if (!note.trim()) return
    await supabase.from('tenant_logs').insert({ tenancy_id: tenancyId, note: note.trim() })
    setNote(''); onChange()
  }
  async function del(l) {
    if (!confirm('Delete this log entry?')) return
    await supabase.from('tenant_logs').delete().eq('id', l.id); onChange()
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-slate-400">Record feedback, conversations or concerns about this tenancy.</p>
      {logs.length === 0 && <p className="text-slate-400">No log entries yet.</p>}
      {logs.map((l) => (
        <div key={l.id} className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-pre-wrap text-slate-700">{l.note}</p>
            <button onClick={() => del(l)} className="shrink-0 text-xs text-red-500 hover:underline">Delete</button>
          </div>
          <p className="mt-1 text-xs text-slate-400">{dateStr(l.created_at)}</p>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Textarea rows={2} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button onClick={add}>Add</Button>
      </div>
    </div>
  )
}
