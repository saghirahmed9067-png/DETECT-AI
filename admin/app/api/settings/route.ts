import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDb } from '@/lib/admin-middleware'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth
    const db = getAdminDb()
    const { data, error } = await db.from('settings').select('key,value,description').order('key')
    if (error) return NextResponse.json({ settings: [] })
    return NextResponse.json({ settings: data || [] })
  } catch { return NextResponse.json({ settings: [] }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth
    const db = getAdminDb()
    const { key, value } = await req.json()
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
    await db.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
