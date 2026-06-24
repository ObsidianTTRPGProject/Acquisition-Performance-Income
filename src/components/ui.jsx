// Small reusable UI primitives to keep pages tidy.

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      {...props}
    />
  )
}

export function Select({ children, ...props }) {
  return (
    <select
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea(props) {
  return (
    <textarea
      rows={3}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      {...props}
    />
  )
}

const badgeColors = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
}

export function Badge({ children, color = 'slate' }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColors[color]}`}>{children}</span>
}

// Maps common status strings to a badge colour.
export function statusColor(status = '') {
  const s = status.toLowerCase()
  if (['paid', 'resolved', 'closed', 'completed', 'tenanted'].includes(s)) return 'green'
  if (['open', 'new', 'available', 'acquisition'].includes(s)) return 'blue'
  if (['in progress', 'acknowledged', 'construction', 'due', 'unpaid', 'active'].includes(s)) return 'amber'
  if (['overdue', 'missed', 'late', 'blocked', 'disputed', 'defaulted'].includes(s)) return 'red'
  return 'slate'
}
