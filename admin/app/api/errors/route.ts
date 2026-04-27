import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDb, logAdminAction } from '@/lib/admin-middleware'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth
    const db = getAdminDb()
    const { data } = await db.from('error_logs')
      .select('id,service,message,stack_trace,resolved,created_at,error_code')
      .order('created_at', { ascending: false })
      .limit(100)
    return NextResponse.json({ errors: data || [] })
  } catch (err: any) {
    return NextResponse.json({ errors: [], error: err?.message }, { status: 200 })
  }
}
