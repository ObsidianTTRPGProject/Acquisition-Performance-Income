import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Card, Button, Field, Input, Textarea, Badge } from '../ui'
import { dateStr } from '../../lib/format'
import { notifyEmail } from '../../lib/notifyEmail'

const QUESTION_CHOICES = ['yes', 'no', 'abstain']
const ABSTAIN = 'abstain'

const emptyForm = { title: '', description: '', kind: 'question', options: ['', ''], allowAbstain: true, multiSelect: false }

// A ballot's selections: multi-select ballots carry an array in `choices`,
// single-select (and legacy) ballots just have `choice`.
function ballotChoices(b) {
  return Array.isArray(b.choices) && b.choices.length ? b.choices : (b.choice ? [b.choice] : [])
}

export default function VotingTab({ propertyId }) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [votes, setVotes] = useState([])
  const [ballots, setBallots] = useState({}) // voteId -> [ballots]
  const [myName, setMyName] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [propertyId, userId])

  async function load() {
    const { data: v } = await supabase.from('votes').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
    setVotes(v || [])
    const ids = (v || []).map((x) => x.id)
    if (ids.length) {
      const { data: b } = await supabase.from('vote_ballots').select('*').in('vote_id', ids)
      const m = {}
      ;(b || []).forEach((x) => { (m[x.vote_id] = m[x.vote_id] || []).push(x) })
      setBallots(m)
    } else setBallots({})
    if (userId) {
      const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single()
      setMyName(prof ? (prof.full_name || prof.email) : (session?.user?.email || 'Me'))
    }
  }

  function setOption(i, value) {
    const options = [...form.options]; options[i] = value
    setForm({ ...form, options })
  }
  function removeOption(i) {
    setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })
  }

  async function addVote() {
    if (!form.title.trim()) return
    const isOptions = form.kind === 'options'
    const options = form.options.map((o) => o.trim()).filter(Boolean)
    if (isOptions && options.length < 2) { alert('Add at least two options to vote on.'); return }
    const row = {
      property_id: propertyId, title: form.title, description: form.description, created_by: userId || null,
      kind: form.kind,
      options: isOptions ? options : null,
      allow_abstain: isOptions ? form.allowAbstain : true,
      multi_select: isOptions ? form.multiSelect : false,
    }
    const { error } = await supabase.from('votes').insert(row)
    if (error) {
      const missing = /votes/i.test(error.message) && /(does not exist|schema cache|find the table)/i.test(error.message)
      const oldSchema = /column/i.test(error.message) && /(kind|options|allow_abstain|multi_select)/i.test(error.message)
      alert('Could not raise vote: ' + error.message
        + (missing ? '\n\nThe voting tables aren\'t set up yet — run supabase/setup-all.sql in the Supabase SQL Editor.' : '')
        + (oldSchema ? '\n\nThe voting tables need updating — run supabase/migration-12-vote-options.sql (or setup-all.sql) in the Supabase SQL Editor.' : ''))
      return
    }
    notifyEmail({ kind: 'vote_raised', title: form.title, description: form.description, propertyId })
    setForm(emptyForm); setAdding(false); load()
  }

  async function delVote(v) {
    if (!confirm(`Delete vote "${v.title}" and all ballots?`)) return
    await supabase.from('votes').delete().eq('id', v.id); load()
  }

  async function castBallot(vote, choice) {
    if (!userId) return
    const list = ballots[vote.id] || []
    const mine = list.find((b) => b.member_id === userId)
    let next = [choice]
    if (vote.multi_select && choice !== ABSTAIN) {
      const current = mine ? ballotChoices(mine).filter((c) => c !== ABSTAIN) : []
      next = current.includes(choice) ? current.filter((c) => c !== choice) : [...current, choice]
      if (!next.length) { // deselected everything → withdraw ballot
        if (mine) { await supabase.from('vote_ballots').delete().eq('id', mine.id); load() }
        return
      }
    }
    const { error } = await supabase.from('vote_ballots').upsert(
      { vote_id: vote.id, member_id: userId, member_name: myName, choice: next[0], choices: next },
      { onConflict: 'vote_id,member_id' }
    )
    if (error) { alert('Could not record your vote: ' + error.message); return }
    load()
  }

  function tally(vote) {
    const list = ballots[vote.id] || []
    const t = {}
    const keys = vote.kind === 'options' ? [...(vote.options || []), ABSTAIN] : QUESTION_CHOICES
    keys.forEach((k) => { t[k] = 0 })
    list.forEach((b) => ballotChoices(b).forEach((c) => { t[c] = (t[c] || 0) + 1 }))
    return t
  }

  function outcome(vote, t) {
    if (vote.kind === 'options') {
      const opts = vote.options || []
      const max = Math.max(0, ...opts.map((o) => t[o] || 0))
      if (max === 0) return 'No result'
      const leaders = opts.filter((o) => (t[o] || 0) === max)
      return leaders.length > 1 ? 'Tied' : leaders[0]
    }
    if (t.yes > t.no) return 'Passed'
    if (t.no > t.yes) return 'Failed'
    return 'Tied'
  }

  function tallyLabel(vote, t) {
    if (vote.kind === 'options') {
      const cast = (ballots[vote.id] || []).length
      return `${cast} ballot${cast === 1 ? '' : 's'} cast`
    }
    return `Yes ${t.yes} · No ${t.no} · Abstain ${t.abstain}`
  }

  async function closeVote(vote) {
    const t = tally(vote)
    const result = outcome(vote, t)
    const summary = vote.kind === 'options'
      ? (vote.options || []).map((o) => `${o} ${t[o] || 0}`).join(' / ')
      : `Yes ${t.yes} / No ${t.no} / Abstain ${t.abstain}`
    if (!confirm(`Close this vote and record the result as "${result}" (${summary})?`)) return
    await supabase.from('votes').update({ status: 'closed', result }).eq('id', vote.id)
    notifyEmail({ kind: 'vote_result', title: vote.title, result, propertyId })
    load()
  }

  async function reopenVote(vote) {
    await supabase.from('votes').update({ status: 'open', result: null }).eq('id', vote.id); load()
  }

  const isOptionsForm = form.kind === 'options'

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div>
          <h2 className="font-medium">Voting &amp; decisions</h2>
          <p className="text-sm text-slate-500">Raise a yes/no motion or a choice between options, each member casts a vote, the result is recorded against this property.</p>
        </div>
        <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ New vote'}</Button>
      </div>

      {adding && (
        <Card className="mb-5 space-y-3 p-4">
          <Field label="Title *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={isOptionsForm ? 'e.g. Which builder do we go with?' : 'e.g. Replace the roof for $14,000'} /></Field>
          <Field label="Details"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

          <Field label="Vote type">
            <div className="flex gap-2">
              {[['question', 'Yes / No question'], ['options', 'Pre-defined options']].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })}
                  className={`rounded-lg px-3 py-1.5 text-sm ${form.kind === k ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {isOptionsForm && (
            <>
              <Field label="Options * (at least two)">
                <div className="space-y-2">
                  {form.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                      {form.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)} className="text-sm text-red-500 hover:underline">Remove</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ''] })} className="text-sm text-brand-600 hover:underline">+ Add option</button>
                </div>
              </Field>
              <div className="flex flex-wrap gap-5 text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.allowAbstain} onChange={(e) => setForm({ ...form, allowAbstain: e.target.checked })} />
                  Allow abstain
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.multiSelect} onChange={(e) => setForm({ ...form, multiSelect: e.target.checked })} />
                  Allow multiple selections
                </label>
              </div>
            </>
          )}

          <Button onClick={addVote}>Raise vote</Button>
        </Card>
      )}

      {votes.length === 0 ? (
        <p className="text-slate-400">No votes yet.</p>
      ) : (
        <div className="space-y-4">
          {votes.map((v) => {
            const t = tally(v)
            const list = ballots[v.id] || []
            const myBallot = list.find((b) => b.member_id === userId)
            const mine = myBallot ? ballotChoices(myBallot) : []
            const open = v.status !== 'closed'
            const live = outcome(v, t)
            const isOptions = v.kind === 'options'
            const choices = isOptions ? [...(v.options || []), ...(v.allow_abstain === false ? [] : [ABSTAIN])] : QUESTION_CHOICES
            return (
              <Card key={v.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{v.title}</h3>
                      {open ? <Badge color="amber">open</Badge> : <Badge color={v.result === 'Failed' || v.result === 'No result' ? 'red' : v.result === 'Tied' ? 'slate' : 'green'}>{v.result}</Badge>}
                    </div>
                    {v.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{v.description}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      Raised {dateStr(v.created_at)}
                      {isOptions && ` · choose ${v.multi_select ? 'any' : 'one'} of ${(v.options || []).length} options`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <div className="font-medium text-slate-700">{tallyLabel(v, t)}</div>
                    {open && <div className="text-xs text-slate-400">currently: {live}</div>}
                  </div>
                </div>

                {isOptions && (
                  <div className="mt-3 space-y-1.5">
                    {choices.map((c) => {
                      const selected = mine.includes(c)
                      const winner = !open && v.result === c
                      return (
                        <button key={c} disabled={!open} onClick={() => open && castBallot(v, c)}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-left text-sm ${selected ? 'border-brand-600 bg-brand-600 text-white' : winner ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600'} ${open ? 'hover:border-brand-400' : 'cursor-default'}`}>
                          <span className={c === ABSTAIN ? 'italic capitalize' : ''}>{c}</span>
                          <span className={`text-xs ${selected ? 'text-white/80' : 'text-slate-400'}`}>{t[c] || 0} vote{(t[c] || 0) === 1 ? '' : 's'}</span>
                        </button>
                      )
                    })}
                    {open && mine.length > 0 && <p className="text-xs text-slate-400">recorded as {mine.join(', ')}</p>}
                  </div>
                )}

                {!isOptions && open && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500">Your vote:</span>
                    {choices.map((c) => (
                      <button key={c} onClick={() => castBallot(v, c)}
                        className={`rounded-lg px-3 py-1 text-sm capitalize ${mine.includes(c) ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                        {c}
                      </button>
                    ))}
                    {myBallot && <span className="text-xs text-slate-400">recorded as {mine.join(', ')}</span>}
                  </div>
                )}

                {list.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {list.map((b) => (
                      <span key={b.id} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs">
                        {b.member_name || 'Member'}: <span className={isOptions ? 'text-slate-700' : ballotChoices(b)[0] === 'yes' ? 'text-green-600' : ballotChoices(b)[0] === 'no' ? 'text-red-600' : 'text-slate-500'}>{ballotChoices(b).join(', ')}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-3 text-xs">
                  {open ? (
                    <button onClick={() => closeVote(v)} className="text-brand-600 hover:underline">Close &amp; record result</button>
                  ) : (
                    <button onClick={() => reopenVote(v)} className="text-brand-600 hover:underline">Reopen</button>
                  )}
                  <button onClick={() => delVote(v)} className="text-red-500 hover:underline">Delete</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
