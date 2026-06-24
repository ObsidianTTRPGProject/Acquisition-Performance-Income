import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { session } = useAuth()
  const navigate = useNavigate()

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="API — Assets, Properties & Investments"
              className="h-10 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextSibling.style.display = 'inline'
              }}
            />
            <span style={{ display: 'none' }} className="text-lg font-semibold text-brand-700">
              API
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Properties
            </NavLink>
            <NavLink to="/map" className={linkClass}>
              Map
            </NavLink>
            <NavLink to="/contacts" className={linkClass}>
              Contacts
            </NavLink>
            <NavLink to="/financials" className={linkClass}>
              Financials
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
            {session && (
              <button onClick={logout} className="ml-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
