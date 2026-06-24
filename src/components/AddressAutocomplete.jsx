import { useState, useRef, useEffect } from 'react'
import { searchAddress } from '../lib/geocode'
import { Input } from './ui'

// Address field with OpenStreetMap autocomplete. Calls onSelect with the
// full structured result { formatted_address, street, suburb, state,
// postcode, country, latitude, longitude, osm_place_id }.
export default function AddressAutocomplete({ value = '', onSelect, placeholder = 'Start typing an address…' }) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef()
  const boxRef = useRef()

  useEffect(() => setQuery(value), [value])

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function change(e) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(timer.current)
    if (q.trim().length < 3) { setResults([]); setOpen(false); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      const r = await searchAddress(q)
      setResults(r); setOpen(true); setLoading(false)
    }, 600) // debounce — respects Nominatim rate limits
  }

  function pick(r) {
    setQuery(r.formatted_address)
    setResults([]); setOpen(false)
    onSelect?.(r)
  }

  return (
    <div ref={boxRef} className="relative">
      <Input value={query} onChange={change} placeholder={placeholder}
        onFocus={() => results.length && setOpen(true)} autoComplete="off" />
      {loading && <p className="mt-1 text-xs text-slate-400">Searching addresses…</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((r) => (
            <li key={r.osm_place_id}>
              <button type="button" onClick={() => pick(r)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50">
                {r.formatted_address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
