import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, Button, Field, Input } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  const forgotPassword = async () => {
    setError(''); setInfo('')
    if (!email) { setError('Enter your email above first, then click "Forgot password".'); return }
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) setError(error.message)
    else setInfo('Password reset email sent — check your inbox for the link.')
  }

  const onBannerError = (e) => {
    const img = e.currentTarget
    if (!img.dataset.fallback) {
      img.dataset.fallback = '1'
      img.src = `${import.meta.env.BASE_URL}logo.png`
      img.className = 'mx-auto my-6 h-24 w-auto'
    } else {
      img.style.display = 'none'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md overflow-hidden p-0">
        <img src={`${import.meta.env.BASE_URL}banner.png`} alt="API — Assets, Properties & Investments" className="w-full" onError={onBannerError} />
        <div className="p-8 pt-6">
          <p className="mb-6 text-center text-sm text-slate-500">Sign in to your account</p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-600">{info}</p>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <button onClick={forgotPassword} className="mt-3 w-full text-center text-xs text-brand-600 hover:underline">
            Forgot password?
          </button>
          <p className="mt-4 text-center text-xs text-slate-400">
            Accounts are created by an administrator in the Supabase dashboard.
          </p>
        </div>
      </Card>
    </div>
  )
}
