import { supabase } from './supabaseClient'

// How many days ahead an unpaid bill starts generating a notification.
const DUE_SOON_DAYS = 14

// Build the live list of notifications for the given user, each with a stable
// `key` so read-state can be tracked. Notifications are derived from data, not
// stored, so they stay current automatically.
export async function buildNotifications(userId) {
  const today = new Date()
  const soon = new Date()
  soon.setDate(today.getDate() + DUE_SOON_DAYS)
  const todayStr = today.toISOString().slice(0, 10)
  const soonStr = soon.toISOString().slice(0, 10)

  const items = []

  // --- Unpaid bills due soon or overdue -----------------------------------
  const { data: bills } = await supabase
    .from('bills')
    .select('id, property_id, description, amount, due_date, status')
    .neq('status', 'paid')
  ;(bills || []).forEach((b) => {
    if (!b.due_date) return
    if (b.due_date <= soonStr) {
      const overdue = b.due_date < todayStr
      items.push({
        key: `bill:${b.id}`,
        type: 'bill',
        title: overdue ? `Overdue bill: ${b.description}` : `Bill due soon: ${b.description}`,
        detail: `${b.due_date}`,
        amount: b.amount,
        overdue,
        link: `/properties/${b.property_id}`,
        date: b.due_date,
      })
    }
  })

  // --- Tasks assigned to me that are still open ----------------------------
  if (userId) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, property_id, title, status, priority, created_at')
      .eq('assigned_user_id', userId)
      .not('status', 'in', '("resolved","closed")')
    ;(tasks || []).forEach((t) => {
      items.push({
        key: `task:${t.id}`,
        type: 'task',
        title: `Task assigned to you: ${t.title}`,
        detail: `${t.priority} priority · ${t.status}`,
        link: `/properties/${t.property_id}`,
        date: t.created_at,
      })
    })
  }

  // Newest first
  items.sort((a, b) => new Date(b.date) - new Date(a.date))
  return items
}

export async function getReadKeys(userId) {
  if (!userId) return new Set()
  const { data } = await supabase.from('notification_reads').select('notification_key').eq('user_id', userId)
  return new Set((data || []).map((r) => r.notification_key))
}

export async function markRead(userId, key) {
  await supabase.from('notification_reads').upsert(
    { user_id: userId, notification_key: key },
    { onConflict: 'user_id,notification_key' }
  )
}

export async function markAllRead(userId, keys) {
  if (!keys.length) return
  await supabase.from('notification_reads').upsert(
    keys.map((k) => ({ user_id: userId, notification_key: k })),
    { onConflict: 'user_id,notification_key' }
  )
}
