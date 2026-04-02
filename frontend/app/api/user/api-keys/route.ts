import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin }          from '@/lib/supabase/admin'
import { createClient }              from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getUserId(req: NextRequest): Promise<string | null> {
  const token =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.cookies.get('sb-access-token')?.value

  if (!token) return null

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    const { data: { user } } = await sb.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

// ── Hash helper (matches public API route) ────────────────────────────────────
function hashApiKey(key: string): string {
  let h = 5381
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i)
  return (h >>> 0).toString(16).padStart(8, '0')
}

// ── Random key generator ─────────────────────────────────────────────────────
function generateRawKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return 'aisc_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── GET — list keys for authenticated user ────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('api_keys')
    .select('id, name, is_active, calls_today, daily_limit, total_calls, last_used_at, created_at, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Never return the raw key or hash — only metadata
  return NextResponse.json({ data: data ?? [] })
}

// ── POST — generate a new key ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' && body.name.trim()
    ? body.name.trim().slice(0, 64)
    : 'My API Key'

  // Limit: max 5 active keys per user
  const sb = getSupabaseAdmin()
  const { count } = await sb
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Maximum of 5 active API keys allowed. Revoke an existing key first.' },
      { status: 429 },
    )
  }

  const rawKey = generateRawKey()
  const keyHash = hashApiKey(rawKey)

  const { data, error } = await sb
    .from('api_keys')
    .insert({
      user_id:     userId,
      key_hash:    keyHash,
      name,
      is_active:   true,
      calls_today: 0,
      daily_limit: 1000,
      total_calls: 0,
    })
    .select('id, name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the raw key ONCE — it will never be shown again
  return NextResponse.json({ data: { ...data, key: rawKey } }, { status: 201 })
}
