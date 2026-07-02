// Helpers for dragging images in from other apps / web pages (e.g. dragging a
// photo straight out of a Facebook chat into the app).
//
// A drag from a web page doesn't carry the file itself — just the image's URL
// (in text/html and/or text/uri-list). Browsers block us fetching that URL
// directly (CORS), so we pull it through the `fetch-image` Edge Function,
// which downloads it server-side and streams the bytes back.

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/bmp': 'bmp', 'image/svg+xml': 'svg',
  'image/heic': 'heic', 'image/avif': 'avif',
}

// Extract candidate image URLs from a DataTransfer that came from a web page.
export function droppedImageUrls(dt) {
  const urls = []
  const seen = new Set()
  const add = (u) => {
    if (u && /^https?:\/\//i.test(u) && !seen.has(u)) { seen.add(u); urls.push(u) }
  }
  const html = dt.getData('text/html')
  if (html) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      doc.querySelectorAll('img[src]').forEach((img) => add(img.getAttribute('src')))
    } catch { /* fall through to uri-list */ }
  }
  const uriList = dt.getData('text/uri-list') || dt.getData('text/plain') || ''
  uriList.split(/[\r\n]+/).forEach((line) => {
    const s = line.trim()
    if (s && !s.startsWith('#')) add(s)
  })
  return urls
}

// Download a web image via the fetch-image Edge Function and return a File.
export async function fetchWebImage(url) {
  const base = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(`${base}/functions/v1/fetch-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    let msg = `fetch failed (${res.status})`
    try { msg = (await res.json()).error || msg } catch { /* keep default */ }
    if (res.status === 404) msg = 'the fetch-image function isn\'t deployed yet — create it from supabase/functions/fetch-image/index.ts in your Supabase dashboard'
    throw new Error(msg)
  }
  const blob = await res.blob()
  const type = blob.type || 'image/jpeg'
  const ext = EXT_BY_TYPE[type] || 'jpg'
  const urlName = (() => {
    try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || '') } catch { return '' }
  })()
  const name = /\.[a-z0-9]{2,5}$/i.test(urlName) ? urlName : `web-image-${Date.now()}.${ext}`
  return new File([blob], name, { type })
}
