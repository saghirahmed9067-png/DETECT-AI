import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _db: SupabaseClient | null = null

export function getDb(): SupabaseClient {
  if (_db) return _db
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtdrwspsbranhunvlbfa.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || 'placeholder-key'
  _db = createClient(url, key, { auth: { persistSession: false } })
  return _db
}

// Legacy export for existing code
export const db = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getDb() as any)[prop]
  }
})
