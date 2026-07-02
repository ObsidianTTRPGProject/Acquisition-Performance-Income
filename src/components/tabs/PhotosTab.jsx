import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { uploadFile, signedUrl, deleteFile } from '../../lib/storage'
import { droppedImageUrls, fetchWebImage } from '../../lib/webImage'
import { Card, Button, Select, Input, Textarea } from '../ui'
import { dateStr } from '../../lib/format'

const CATEGORIES = ['progress', 'issue', 'general']
const BUCKET = 'property-photos'
const GROUPINGS = [
  ['batch', 'Import batch'],
  ['date', 'Date'],
  ['status', 'Status'],
  ['none', 'No grouping'],
]

const today = () => new Date().toISOString().slice(0, 10)

export default function PhotosTab({ propertyId }) {
  const [photos, setPhotos] = useState([])
  const [filter, setFilter] = useState('all')
  const [groupBy, setGroupBy] = useState('batch')

  // Staged import batch (files waiting to be uploaded together).
  const [staged, setStaged] = useState([]) // [{ key, file, preview }]
  const [tags, setTags] = useState({ takenOn: today(), category: 'progress', description: '' })
  const [fetching, setFetching] = useState(false) // pulling a dragged web image
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => { load() }, [propertyId])
  useEffect(() => () => staged.forEach((s) => URL.revokeObjectURL(s.preview)), []) // eslint-disable-line

  async function load() {
    const { data } = await supabase.from('photos').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
    const withUrls = await Promise.all(
      (data || []).map(async (p) => ({ ...p, url: await signedUrl(BUCKET, p.storage_path) }))
    )
    setPhotos(withUrls)
  }

  function stageFiles(files) {
    const images = [...files].filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setStaged((s) => [
      ...s,
      ...images.map((file) => ({ key: `${Date.now()}-${Math.random()}`, file, preview: URL.createObjectURL(file) })),
    ])
  }

  function unstage(key) {
    setStaged((s) => {
      const item = s.find((x) => x.key === key)
      if (item) URL.revokeObjectURL(item.preview)
      return s.filter((x) => x.key !== key)
    })
  }
  function clearStaged() {
    staged.forEach((s) => URL.revokeObjectURL(s.preview))
    setStaged([])
  }

  async function onDrop(e) {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    // 1) Real files (dragged from the computer)
    if (e.dataTransfer.files?.length) { stageFiles(e.dataTransfer.files); return }
    // 2) Images dragged from another website (e.g. a Facebook chat)
    const urls = droppedImageUrls(e.dataTransfer)
    if (!urls.length) return
    setFetching(true)
    const errors = []
    for (const url of urls) {
      try { stageFiles([await fetchWebImage(url)]) } catch (err) { errors.push(err.message) }
    }
    setFetching(false)
    if (errors.length) alert('Could not import the dragged image: ' + errors[0])
  }

  async function uploadAll() {
    if (!staged.length) return
    setBusy(true)
    const batchId = crypto.randomUUID()
    const rows = []
    try {
      for (let i = 0; i < staged.length; i++) {
        setProgress(`Uploading ${i + 1} of ${staged.length}…`)
        const path = await uploadFile(BUCKET, propertyId, staged[i].file)
        rows.push({
          property_id: propertyId,
          storage_path: path,
          category: tags.category,
          caption: tags.description,
          taken_on: tags.takenOn || today(),
          batch_id: batchId,
        })
      }
      setProgress('Saving…')
      let { error } = await supabase.from('photos').insert(rows)
      if (error && /batch_id/i.test(error.message)) {
        // Table not migrated yet — save without the batch column so nothing is lost.
        ;({ error } = await supabase.from('photos').insert(rows.map(({ batch_id, ...r }) => r)))
        if (!error) alert('Photos saved, but batch grouping needs a database update — run supabase/migration-13-photo-batches.sql (or setup-all.sql) in the Supabase SQL Editor.')
      }
      if (error) throw error
      clearStaged()
      setTags({ takenOn: today(), category: tags.category, description: '' })
      await load()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setBusy(false)
    setProgress('')
  }

  async function remove(photo) {
    if (!confirm('Delete this photo?')) return
    await deleteFile(BUCKET, photo.storage_path)
    await supabase.from('photos').delete().eq('id', photo.id)
    await load()
  }

  async function setCover(photo) {
    const { error } = await supabase
      .from('properties')
      .update({ cover_photo_path: photo.storage_path })
      .eq('id', propertyId)
    if (error) {
      alert(
        'Could not set the cover photo: ' +
          error.message +
          '\n\nIf this mentions "cover_photo_path", run supabase/migration-02-cover.sql in your Supabase SQL Editor first.'
      )
      return
    }
    alert('Done — set as the cover photo. It appears on the property tile and the Overview tab.')
  }

  const shown = filter === 'all' ? photos : photos.filter((p) => p.category === filter)

  // Group the gallery. Returns [{ key, title, items }] newest-first (photos are
  // already ordered newest-first, so first-seen group order is correct).
  function grouped() {
    if (groupBy === 'none') return [{ key: 'all', title: null, items: shown }]
    const map = new Map()
    shown.forEach((p) => {
      let key, title
      if (groupBy === 'batch') {
        key = p.batch_id || `single-${p.id}`
        const bits = [dateStr(p.taken_on || p.created_at), p.category, p.caption].filter(Boolean)
        title = bits.join(' · ')
      } else if (groupBy === 'date') {
        key = p.taken_on || (p.created_at || '').slice(0, 10)
        title = dateStr(key)
      } else {
        key = p.category || 'general'
        title = key
      }
      if (!map.has(key)) map.set(key, { key, title, items: [] })
      map.get(key).items.push(p)
    })
    return [...map.values()]
  }

  const groups = grouped()

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
          {fetching ? 'Fetching dragged image…' : (
            <>
              <span className="font-medium text-slate-600">Drag photos here</span> — from your computer or straight from another website (e.g. a Facebook chat) —{' '}
              <label className="cursor-pointer text-brand-600 hover:underline">
                or browse
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { stageFiles(e.target.files); e.target.value = '' }} />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Date</span>
            <Input type="date" value={tags.takenOn} onChange={(e) => setTags({ ...tags, takenOn: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Status</span>
            <Select value={tags.category} onChange={(e) => setTags({ ...tags, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </label>
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block text-slate-600">Description</span>
            <Input value={tags.description} onChange={(e) => setTags({ ...tags, description: e.target.value })} placeholder="Applied to every photo in this import" />
          </label>
        </div>

        {staged.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {staged.map((s) => (
                <div key={s.key} className="relative">
                  <img src={s.preview} alt={s.file.name} className="h-20 w-20 rounded-lg object-cover" />
                  <button onClick={() => unstage(s.key)} title="Remove"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white hover:bg-red-600">×</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={uploadAll} disabled={busy}>
                {busy ? (progress || 'Uploading…') : `Upload ${staged.length} photo${staged.length === 1 ? '' : 's'}`}
              </Button>
              {!busy && <button onClick={clearStaged} className="text-sm text-slate-400 hover:underline">Clear</button>}
            </div>
          </div>
        )}
      </Card>

      {/* ---------- Review ---------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {['all', ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1 text-sm ${filter === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              {c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Group by
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            {GROUPINGS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="text-slate-400">No photos yet.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              {g.title != null && (
                <h3 className="mb-2 text-sm font-medium capitalize text-slate-600">
                  {g.title || 'Untagged'} <span className="font-normal text-slate-400">({g.items.length})</span>
                </h3>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {g.items.map((p) => (
                  <Card key={p.id} className="overflow-hidden">
                    {p.url ? <img src={p.url} alt={p.caption} className="h-40 w-full object-cover" /> : <div className="h-40 bg-slate-100" />}
                    <div className="p-2 text-xs">
                      <p className="truncate font-medium">{p.caption || p.category}</p>
                      <p className="mt-0.5 text-slate-400">{dateStr(p.taken_on || p.created_at)} · {p.category}</p>
                      <div className="mt-1 flex items-center justify-between text-slate-400">
                        <button onClick={() => setCover(p)} className="text-brand-600 hover:underline">Set as cover</button>
                        <button onClick={() => remove(p)} className="text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
