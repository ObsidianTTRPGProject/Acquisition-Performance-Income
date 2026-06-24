import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Field, Input } from '../components/ui'

export default function Profile() {
  const { session } = useAuth()
  const user = session?.user
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' })
  const [loginEmail, setLoginEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setForm({
      full_name: data?.full_name || '',
      phone: data?.phone || '',
      email: data?.email || user.email || '',
    })
    setLoginEmail(user.email || '')
    setLoading(false)
  }

  async function save() {
    setBusy(true)
    setMessage('')
    // Save name / phone / display email to the profile row.
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: form.full_name || null,
      phone: form.phone || null,
      email: form.email || null,
    })
    if (error) {
      setMessage('Could not save: ' + error.message)
      setBusy(false)
      return
    }
    // If they changed their login email, ask Supabase Auth to update it.
    // This sends a confirmation link; the login email changes only once confirmed.
    let note = 'Profile saved.'
    if (form.email && form.email !== loginEmail) {
      const { error: authErr } = await supabase.auth.updateUser({ email: form.email })
      if (authErr) note = 'Profile saved, but the login email could not be updated: ' + authErr.message
      else note = 'Profile saved. Check your inbox to confirm the new login email address.'
    }
    setMessage(note)
    setBusy(false)
  }

  if (!user) return <p className="text-slate-500">You need to be signed in.</p>
  if (loading) return <p className="text-slate-400">Loading…</p>

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">My Profile</h1>
      <p className="mb-6 text-sm text-slate-500">
        These details are how you appear to the rest of the team (e.g. when a task is assigned to you).
      </p>

      <Card className="space-y-4 p-6">
        <Field label="Full name">
          <Input value={form.full_name} onChange={set('full_name')} placeholder="e.g. Josh Plunket" />
        </Field>
        <Field label="Contact number">
          <Input value={form.phone} onChange={set('phone')} placeholder="e.g. 0400 000 000" />
        </Field>
        <Field label="Email address">
          <Input type="email" value={form.email} onChange={set('email')} />
        </Field>
        <p className="text-xs text-slate-400">
          Current login email: {loginEmail}. Changing the email sends a confirmation link — your login
          only updates once you confirm it.
        </p>

        {message && <p className="text-sm text-brand-700">{message}</p>}

        <div className="flex gap-2">
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
          <Button variant="secondary" onClick={load} disabled={busy}>Reset</Button>
        </div>
      </Card>
    </div>
  )
}
