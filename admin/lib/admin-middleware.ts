import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifyAdminSession, COOKIE_NAME } from './auth'

let _adminDb: SupabaseClient | null = null

export function getAdminDb(): SupabaseClient {
  if (_adminDb) return _adminDb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  _adminDb = createClient(url, key, { auth: { persistSession: false } })
  return _adminDb
}

export async function requireAdmin(req: NextRequest): Promise<{ ip: string } | NextResponse> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  const valid = await verifyAdminSession(token)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  return { ip }
}

export async function logAdminAction(
  action: string,
  targetId: string | null,
  ip: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await getAdminDb().from('admin_audit_log').insert({
      action, admin_ip: ip,
      metadata: { ...metadata, target_id: targetId },
    })
  } catch { /* non-fatal */ }
}
