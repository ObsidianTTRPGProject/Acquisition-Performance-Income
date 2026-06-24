import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { uploadFile, signedUrl, deleteFile } from '../../lib/storage'
import { Card, Button, Select, Input } from '../ui'

const CATEGORIES = ['progress', 'issue', 'general']
const BUCKET = 'property-photos'

export default function PhotosTab({ propertyId }) {
  const [photos, setPhotos] = useState([])
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState('progress')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [propertyId])

  async function load() {
    const { data } = await supabase.from('photos').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
    const withUrls = await Promise.all(
      (data || []).map(async (p) => ({ ...p, url: await signedUrl(BUCKET, p.storage_path) }))
    )
    setPhotos(withUrls)
  }

  async function upload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const path = await uploadFile(BUCKET, propertyId, file)
      await supabase.from('photos').insert({
        property_id: propertyId,
        storage_path: path,
        category,
        caption,
        taken_on: new Date().toISOString().slice(0, 10),
      })
      setCaption('')
      await load()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setBusy(false)
    e.target.value = ''
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

  return (
    <div>
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Category</span>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-slate-600">Caption</span>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional" />
          </label>
          <label>
            <span className="sr-only">Upload</span>
            <input type="file" accept="image/*" onChange={upload} disabled={busy} className="text-sm" />
          </label>
        </div>
      </Card>

      <div className="mb-4 flex gap-2">
        {['all', ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`rounded-full px-3 py-1 text-sm ${filter === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            {c}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-slate-400">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.url ? <img src={p.url} alt={p.caption} className="h-40 w-full object-cover" /> : <div className="h-40 bg-slate-100" />}
              <div className="p-2 text-xs">
                <p className="truncate font-medium">{p.caption || p.category}</p>
                <div className="mt-1 flex items-center justify-between text-slate-400">
                  <button onClick={() => setCover(p)} className="text-brand-600 hover:underline">Set as cover</button>
                  <button onClick={() => remove(p)} className="text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
