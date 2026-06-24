// Shared formatting helpers (AUD).
// Always shows thousands separators and 2 decimal places, e.g. $1,234.00
export const money = (n) =>
  n == null || isNaN(n)
    ? '—'
    : new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n))

export const moneyExact = (n) =>
  n == null || isNaN(n)
    ? '—'
    : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(n))

export const dateStr = (d) =>
  !d ? '—' : new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
