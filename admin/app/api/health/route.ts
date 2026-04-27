import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDb } from '@/lib/admin-middleware'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth
    const db = getAdminDb()
    const start = Date.now()
    const { error } = await db.from('profiles').select('id').limit(1)
    const dbLatency = Date.now() - start
    return NextResponse.json({
      ok: !error, db: !error ? 'connected' : 'error',
      db_latency_ms: dbLatency, ts: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message })
  }
}
