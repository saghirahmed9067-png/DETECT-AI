import { NextRequest, NextResponse } from 'next/server'
import { auth }               from '@clerk/nextjs/server'
import { getSupabaseAdmin }   from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Always use the Clerk session — never trust uid from request body
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { email, display_name } = await req.json()

    const { error } = await getSupabaseAdmin().from('profiles').upsert({
      id:                userId,   // session-verified, not body-supplied
      email:             email || '',
      display_name:      display_name || email?.split('@')[0] || 'User',
      plan:              'free',
      plan_id:           'free',
      credits_remaining: 9999,
      scan_count:        0,
      monthly_scans:     0,
      created_at:        new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'id', ignoreDuplicates: false })

    if (error) {
      console.error('[profiles/create] Supabase error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[profiles/create] Error:', err?.message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
