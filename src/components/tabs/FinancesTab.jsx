import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getCashflow, summariseByYear } from '../../lib/finance'
import { Card, Button, Field, Input, Select } from '../ui'
import { money, dateStr } from '../../lib/format'

export default function FinancesTab({ propertyId }) {
  const [events, setEvents] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ entry_date: '', direction: 'expense', amount: '', category: '', description: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => { load() }, [propertyId])

  async function load() {
    setEvents(await getCashflow(propertyId))
  }

  async function add() {
    if (!form.amount || !form.entry_date) return
    await supabase.from('cashflow').insert({
      property_id: propertyId, ...form, amount: Number(form.amount),
    })
    setForm({ entry_date: '', direction: 'expense', amount: '', category: '', description: '' })
    setAdding(false); load()
  }

  const income = events.filter((e) => e.direction === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = events.filter((e) => e.direction === 'expense').reduce((s, e) => s + e.amount, 0)
  const years = summariseByYear(events)
  const sorted = [...events].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label="Income" value={money(income)} color="text-green-600" />
        <Stat label="Expenses" value={money(expense)} color="text-red-600" />
        <Stat label="Net" value={money(income - expense)} color={income - expense >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium">Cash flow ledger</h2>
        <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Manual entry'}</Button>
      </div>

      {adding && (
        <Card className="mb-5 space-y-3 p-4">
          <p className="text-sm text-slate-500">For one-offs like purchase, sale proceeds or misc income. Bills and rent are pulled in automatically.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Input type="date" value={form.entry_date} onChange={set('entry_date')} />
            <Select value={form.direction} onChange={set('direction')}>
              <option value="expense">Expense</option><option value="income">Income</option>
            </Select>
            <Input type="number" placeholder="Amount" value={form.amount} onChange={set('amount')} />
            <Input placeholder="Category" value={form.category} onChange={set('category')} />
            <Input placeholder="Description" value={form.description} onChange={set('description')} />
          </div>
          <Button onClick={add}>Add entry</Button>
        </Card>
      )}

      {years.length > 0 && (
        <Card className="mb-5 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-600">By year</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400"><tr><th>Year</th><th className="text-right">In</th><th className="text-right">Out</th><th className="text-right">Net</th></tr></thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-t border-slate-100">
                  <td className="py-1.5">{y.year}</td>
                  <td className="py-1.5 text-right text-green-600">{money(y.income)}</td>
                  <td className="py-1.5 text-right text-red-600">{money(y.expense)}</td>
                  <td className={`py-1.5 text-right font-medium ${y.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(y.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {sorted.length === 0 ? (
        <p className="text-slate-400">No financial activity yet.</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Description</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">{dateStr(e.date)}</td>
                  <td className="px-4 py-2">{e.description}</td>
                  <td className="px-4 py-2 text-slate-500">{e.category}</td>
                  <td className={`px-4 py-2 text-right font-medium ${e.direction === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {e.direction === 'income' ? '+' : '−'}{money(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </Card>
  )
}
