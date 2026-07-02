// Supabase Edge Function: fetch-image
// Fetches an image from an external URL server-side (no browser CORS limits)
// so users can drag images straight from other websites (e.g. a Facebook chat)
// into the app. Returns the raw image bytes.
// Create this in your Supabase dashboard (Edge Functions → Create function →
// name it "fetch-image" → paste this code → Deploy). No secrets required.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } })

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB safety cap

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') return json({ error: 'missing url' }, 400)
    let parsed: URL
    try { parsed = new URL(url) } catch { return json({ error: 'invalid url' }, 400) }
    if (!/^https?:$/.test(parsed.protocol)) return json({ error: 'only http(s) urls allowed' }, 400)

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (image fetcher)', Accept: 'image/*,*/*;q=0.8' },
      redirect: 'follow',
    })
    if (!res.ok) return json({ error: `source returned ${res.status}` }, 502)

    const type = res.headers.get('content-type') || ''
    if (!type.startsWith('image/')) return json({ error: `not an image (got ${type || 'unknown type'})` }, 415)

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return json({ error: 'image too large' }, 413)

    return new Response(buf, { headers: { ...cors, 'content-type': type } })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
