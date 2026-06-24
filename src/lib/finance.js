import { supabase } from './supabaseClient'

// Build a normalised list of money-in / money-out events by combining:
//  - paid bills          -> expenses
//  - rent payments paid  -> income
//  - manual cashflow rows -> income or expense
// Pass a propertyId to scope to one property, or omit for the whole portfolio.
export async function getCashflow(propertyId = null) {
  const scope = (q) => (propertyId ? q.eq('property_id', propertyId) : q)

  const { data: bills } = await scope(supabase.from('bills').select('*'))
  const { data: manual } = await scope(supabase.from('cashflow').select('*'))

  // Rent payments join through tenancies to reach a property.
  let tenancyFilter = supabase.from('tenancies').select('id, property_id')
  if (propertyId) tenancyFilter = tenancyFilter.eq('property_id', propertyId)
  const { data: tenancies } = await tenancyFilter
  const tenancyToProp = {}
  ;(tenancies || []).forEach((t) => (tenancyToProp[t.id] = t.property_id))
  const tIds = (tenancies || []).map((t) => t.id)
  let payments = []
  if (tIds.length) {
    const { data } = await supabase.from('rent_payments').select('*').in('tenancy_id', tIds)
    payments = data || []
  }

  const events = []
  ;(bills || []).forEach((b) => {
    if (b.status === 'paid' || b.paid_date) {
      events.push({
        id: b.id,
        source: 'bill',
        property_id: b.property_id,
        date: b.paid_date || b.due_date || b.issue_date,
        direction: 'expense',
        amount: Number(b.amount || 0),
        category: b.category || 'bill',
        description: b.description,
      })
    }
  })
  ;(payments || []).forEach((p) => {
    if (Number(p.amount_paid) > 0) {
      events.push({
        id: p.id,
        source: 'rent',
        property_id: tenancyToProp[p.tenancy_id],
        date: p.paid_date || p.due_date,
        direction: 'income',
        amount: Number(p.amount_paid),
        category: 'rent',
        description: 'Rent payment',
      })
    }
  })
  ;(manual || []).forEach((m) => {
    events.push({
      id: m.id,
      source: 'manual',
      property_id: m.property_id,
      date: m.entry_date,
      direction: m.direction,
      amount: Number(m.amount || 0),
      category: m.category || 'other',
      description: m.description,
    })
  })

  return events.filter((e) => e.date)
}

// Group events into { year: { income, expense, net, byCategory } }.
export function summariseByYear(events) {
  const years = {}
  events.forEach((e) => {
    const y = new Date(e.date).getFullYear()
    years[y] = years[y] || { year: y, income: 0, expense: 0, net: 0, byCategory: {} }
    years[y][e.direction] += e.amount
    years[y].net += e.direction === 'income' ? e.amount : -e.amount
    if (e.direction === 'expense') {
      years[y].byCategory[e.category] = (years[y].byCategory[e.category] || 0) + e.amount
    }
  })
  return Object.values(years).sort((a, b) => a.year - b.year)
}
