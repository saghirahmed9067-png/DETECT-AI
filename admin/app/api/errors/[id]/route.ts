import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDb } from '@/lib/admin-middleware'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    const { resolved } = await req.json()
    const db = getAdminDb()
    await db.from('error_logs').update({ resolved }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
