import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { uploadFile, signedUrl, deleteFile } from '../../lib/storage'
import { Card, Button, Select, Input, Textarea } from '../ui'
import { dateStr } from '../../lib/format'

const BUCKET = 'property-docs'

const today = () => new Date().toISOString().slice(0, 10)

// "contract, warranty" -> ["contract", "warranty"] (deduped, lowercase)
function parseTags(text) {
  return [...new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))]
}
const tagText = (doc) => (Array.isArray(doc.tags) ? doc.tags.join(', ') : '')

function fileIcon(name = '', type = '') {
  const ext = name.split('.').pop()?.toLowerCase()
  if (type.startsWith('image/')) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return '📝'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️'
  return '📎'
}
function sizeStr(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
const stripExt = (name) => name.replace(/\.[a-z0-9]{2,5}$/i, '')

export default function DocumentsTab({ propertyId }) {
  const [docs, setDocs] = useState([])
  const [contacts, setContacts] = useState([])
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('all')

  // Staged import (files waiting to be uploaded together).
  const [staged, setStaged] = useState([]) // [{ key, file, title }]
  const [shared, setShared] = useState({ docDate: today(), tags: '', description: '', contactId: '' })
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)

  // Inline metadata editing.
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => { load() }, [propertyId])

  async function load() {
    const { data, error } = await supabase.from('documents').select('*').eq('property_id', propertyId).order('doc_date', { ascending: false }).order('created_at', { ascending: false })
    if (error && /documents/i.test(error.message) && /(does not exist|schema cache|find the table)/i.test(error.message)) {
      alert('The documents table isn\'t set up yet — run supabase/migration-14-documents.sql (or setup-all.sql) in the Supabase SQL Editor.')
    }
    setDocs(data || [])
    const { data: c } = await supabase.from('contacts').select('id, name, company').order('name')
    setContacts(c || [])
  }

  function stageFiles(files) {
    const list = [...files]
    if (!list.length) return
    setStaged((s) => [
      ...s,
      ...list.map((file) => ({ key: `${Date.now()}-${Math.random()}`, file, title: stripExt(file.name) })),
    ])
  }
  const unstage = (key) => setStaged((s) => s.filter((x) => x.key !== key))
  const setTitle = (key, title) => setStaged((s) => s.map((x) => (x.key === key ? { ...x, title } : x)))

  function onDrop(e) {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    if (e.dataTransfer.files?.length) stageFiles(e.dataTransfer.files)
  }

  async function uploadAll() {
    if (!staged.length) return
    if (staged.some((s) => !s.title.trim())) { alert('Every document needs a title.'); return }
    setBusy(true)
    try {
      const rows = []
      for (let i = 0; i < staged.length; i++) {
        setProgress(`Uploading ${i + 1} of ${staged.length}…`)
        const { file, title } = staged[i]
        const path = await uploadFile(BUCKET, propertyId, file)
        rows.push({
          property_id: propertyId,
          contact_id: shared.contactId || null,
          title: title.trim(),
          description: shared.description,
          tags: parseTags(shared.tags),
          doc_date: shared.docDate || today(),
          storage_path: path,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
      }
      setProgress('Saving…')
      const { error } = await supabase.from('documents').insert(rows)
      if (error) {
        const missing = /documents/i.test(error.message) && /(does not exist|schema cache|find the table)/i.test(error.message)
        throw new Error(error.message + (missing ? '\n\nThe documents table isn\'t set up yet — run supabase/migration-14-documents.sql (or setup-all.sql) in the Supabase SQL Editor.' : ''))
      }
      setStaged([])
      setShared({ docDate: today(), tags: '', description: '', contactId: '' })
      await load()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setBusy(false)
    setProgress('')
  }

  async function download(doc) {
    const url = await signedUrl(BUCKET, doc.storage_path)
    if (!url) { alert('Could not create a download link.'); return }
    window.open(url, '_blank', 'noopener')
  }

  async function remove(doc) {
    if (!confirm(`Delete "${doc.title}"? The file will be removed too.`)) return
    await deleteFile(BUCKET, doc.storage_path)
    await supabase.from('documents').delete().eq('id', doc.id)
    await load()
  }

  function startEdit(doc) {
    setEditingId(doc.id)
    setEditForm({
      title: doc.title || '',
      description: doc.description || '',
      tags: tagText(doc),
      docDate: doc.doc_date || '',
      contactId: doc.contact_id || '',
    })
  }
  async function saveEdit(doc) {
    if (!editForm.title.trim()) { alert('The document needs a title.'); return }
    const { error } = await supabase.from('documents').update({
      title: editForm.title.trim(),
      description: editForm.description,
      tags: parseTags(editForm.tags),
      doc_date: editForm.docDate || null,
      contact_id: editForm.contactId || null,
    }).eq('id', doc.id)
    if (error) { alert('Could not save: ' + error.message); return }
    setEditingId(null)
    load()
  }

  const contactName = (id) => {
    const c = contacts.find((x) => x.id === id)
    return c ? (c.company ? `${c.name} (${c.company})` : c.name) : null
  }

  const allTags = [...new Set(docs.flatMap((d) => (Array.isArray(d.tags) ? d.tags : [])))].sort()
  const needle = q.trim().toLowerCase()
  const shown = docs.filter((d) => {
    if (tagFilter !== 'all' && !(Array.isArray(d.tags) && d.tags.includes(tagFilter))) return false
    if (!needle) return true
    const hay = [d.title, d.description, d.file_name, tagText(d), contactName(d.contact_id) || ''].join(' ').toLowerCase()
    return hay.includes(needle)
  })

  return (
    <div>
      {/* ---------- Import ---------- */}
      <Card
        className={`mb-5 p-4 ${dragOver ? 'ring-2 ring-brand-500 bg-brand-50/50' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDragOver(true) }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragOver(false) } }}
        onDrop={onDrop}
      >
        <div className="mb-3 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          <span className="font-medium text-slate-600">Drag documents here</span> — contracts, warranties, invoices, anything —{' '}
          <label className="cursor-pointer text-brand-600 hover:underline">
            or browse
            <input type="file" multiple className="hidden"
              onChange={(e) => { stageFiles(e.target.files); e.target.value = '' }} />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Date</span>
            <Input type="date" value={shared.docDate} onChange={(e) => setShared({ ...shared, docDate: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Contact (optional)</span>
            <Select value={shared.contactId} onChange={(e) => setShared({ ...shared, contactId: e.target.value })}>
              <option value="">— none —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.company ? `${c.name} (${c.company})` : c.name}</option>)}
            </Select>
          </label>
          <label className="min-w-[180px] flex-1 text-sm">
            <span className="mb-1 block text-slate-600">Tags (comma-separated)</span>
            <Input value={shared.tags} onChange={(e) => setShared({ ...shared, tags: e.target.value })} placeholder="e.g. contract, build" />
          </label>
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block text-slate-600">Description</span>
            <Input value={shared.description} onChange={(e) => setShared({ ...shared, description: e.target.value })} placeholder="Applied to every document in this import" />
          </label>
        </div>

        {staged.length > 0 && (
          <div className="mt-4">
            <div className="space-y-2">
              {staged.map((s) => (
                <div key={s.key} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span>{fileIcon(s.file.name, s.file.type)}</span>
                  <div className="flex-1">
                    <Input value={s.title} onChange={(e) => setTitle(s.key, e.target.value)} placeholder="Title *" />
                  </div>
                  <span className="hidden text-xs text-slate-400 sm:block">{s.file.name} · {sizeStr(s.file.size)}</span>
                  <button onClick={() => unstage(s.key)} className="text-sm text-red-500 hover:underline">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={uploadAll} disabled={busy}>
                {busy ? (progress || 'Uploading…') : `Upload ${staged.length} document${staged.length === 1 ? '' : 's'}`}
              </Button>
              {!busy && <button onClick={() => setStaged([])} className="text-sm text-slate-400 hover:underline">Clear</button>}
            </div>
          </div>
        )}
      </Card>

      {/* ---------- Review ---------- */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-xs flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...allTags].map((t) => (
            <button key={t} onClick={() => setTagFilter(t)}
              className={`rounded-full px-3 py-1 text-sm ${tagFilter === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-slate-400">{docs.length === 0 ? 'No documents yet.' : 'Nothing matches your search.'}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((d) => (
            <Card key={d.id} className="p-4">
              {editingId === d.id ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-[200px] flex-1 text-sm">
                      <span className="mb-1 block text-slate-600">Title *</span>
                      <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Date</span>
                      <Input type="date" value={editForm.docDate} onChange={(e) => setEditForm({ ...editForm, docDate: e.target.value })} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Contact</span>
                      <Select value={editForm.contactId} onChange={(e) => setEditForm({ ...editForm, contactId: e.target.value })}>
                        <option value="">— none —</option>
                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.company ? `${c.name} (${c.company})` : c.name}</option>)}
                      </Select>
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Tags (comma-separated)</span>
                    <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Description</span>
                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </label>
                  <div className="flex gap-3">
                    <Button onClick={() => saveEdit(d)}>Save</Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{fileIcon(d.file_name || d.storage_path, d.file_type || '')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => download(d)} className="font-medium text-brand-700 hover:underline">{d.title}</button>
                      {(Array.isArray(d.tags) ? d.tags : []).map((t) => (
                        <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t}</span>
                      ))}
                    </div>
                    {d.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{d.description}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {dateStr(d.doc_date || d.created_at)}
                      {d.contact_id && contactName(d.contact_id) && <> · {contactName(d.contact_id)}</>}
                      {d.file_name && <> · {d.file_name}</>}
                      {d.file_size ? <> · {sizeStr(d.file_size)}</> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-xs">
                    <button onClick={() => download(d)} className="text-brand-600 hover:underline">Download</button>
                    <button onClick={() => startEdit(d)} className="text-slate-500 hover:underline">Edit</button>
                    <button onClick={() => remove(d)} className="text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
