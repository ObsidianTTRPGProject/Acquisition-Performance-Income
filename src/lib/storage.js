import { supabase } from './supabaseClient'

// Upload a file to a private bucket and return its storage path.
export async function uploadFile(bucket, propertyId, file) {
  const ext = file.name.split('.').pop()
  const path = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return path
}

// Create a short-lived signed URL to view a private file.
export async function signedUrl(bucket, path, expiresIn = 3600) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

export async function deleteFile(bucket, path) {
  if (!path) return
  await supabase.storage.from(bucket).remove([path])
}
