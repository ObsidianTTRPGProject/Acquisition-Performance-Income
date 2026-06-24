import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { buildNotifications, getReadKeys, markRead, markAllRead } from '../lib/notifications'
import { money } from '../lib/format'

export default function NotificationBell() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [items, setItems] = useState([])
  const [readKeys, setReadKeys] = useState(new Set())
  const [open, setOpen] = useState(false)
  const boxRef = useRef()
  const navigate = useNavigate()

  async function load() {
    if (!userId) return
    const [list, reads] = await Promise.all([buildNotifications(userId), getReadKeys(userId)])
    setItems(list)
    setReadKeys(reads)
  }

  useEffect(() => { load() }, [userId])

  // Close on outside click.
  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((i) => !readKeys.has(i.key))
  const unreadCount = unread.length

  async function open_item(item) {
    if (!readKeys.has(item.key)) {
      await markRead(userId, item.key)
      setReadKeys(new Set([...readKeys, item.key]))
    }
    setOpen(false)
    navigate(item.link)
  }

  async function readAll() {
    const keys = unread.map((i) => i.key)
    await markAllRead(userId, keys)
    setReadKeys(new Set([...readKeys, ...keys]))
  }

  return (
    <div ref={boxRef} className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-100" title="Notifications">
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={readAll} className="text-xs text-brand-600 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">You're all caught up.</p>
            ) : (
              items.map((i) => {
                const isUnread = !readKeys.has(i.key)
                return (
                  <button key={i.key} onClick={() => open_item(i)}
                    className={`block w-full border-b border-slate-50 px-3 py-2 text-left hover:bg-slate-50 ${isUnread ? 'bg-brand-50/40' : ''}`}>
                    <div className="flex items-start gap-2">
                      <span>{i.type === 'bill' ? '💸' : '🛠️'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${isUnread ? 'font-medium text-slate-800' : 'text-slate-600'}`}>{i.title}</p>
                        <p className="text-xs text-slate-400">
                          {i.detail}{i.amount != null ? ` · ${money(i.amount)}` : ''}
                          {i.overdue ? ' · overdue' : ''}
                        </p>
                      </div>
                      {isUnread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
