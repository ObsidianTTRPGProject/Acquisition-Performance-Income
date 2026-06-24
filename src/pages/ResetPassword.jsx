import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, Button, Field, Input } from '../components/ui'

// Reached from the password-reset email link. Supabase establishes a temporary
// recovery session from the link; here the user sets a new password.
export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // A session (recovery or normal) means we can update the password.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-center text-xl font-semibold text-brand-700">Set a new password</h1>
        {done ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-green-600">Your password has been updated.</p>
            <Button className="mt-4 w-full" onClick={() => navigate('/')}>Continue</Button>
          </div>
        ) : !ready ? (
          <p className="mt-4 text-center text-sm text-slate-500">
            Open this page from the reset link in your email. If you came here directly, request a new
            reset from the login screen.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <Field label="New password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Updating…' : 'Update password'}</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
