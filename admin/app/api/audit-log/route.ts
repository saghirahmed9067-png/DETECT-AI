import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDb } from '@/lib/admin-middleware'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth
    const db = getAdminDb()

    // Try admin_audit_log first, fall back to audit_log
    let data: any[] = []
    const r1 = await db.from('admin_audit_log')
      .select('id,action,admin_ip,metadata,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!r1.error && r1.data) {
      data = (r1.data || []).map((l: any) => ({
        id: l.id, action_type: l.action,
        admin_ip: l.admin_ip, ip_address: l.admin_ip,
        metadata: l.metadata, created_at: l.created_at,
      }))
    } else {
      const r2 = await db.from('admin_activity_logs')
        .select('id,action,admin_id,target_id,details,created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      data = (r2.data || []).map((l: any) => ({
        id: l.id, action_type: l.action, admin_id: l.admin_id,
        target_resource: l.target_id, metadata: l.details, created_at: l.created_at,
      }))
    }
    return NextResponse.json({ logs: data })
  } catch (err: any) {
    return NextResponse.json({ logs: [], error: err?.message }, { status: 200 })
  }
}
