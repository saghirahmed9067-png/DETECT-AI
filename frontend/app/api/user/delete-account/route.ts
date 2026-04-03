import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sb = getSupabaseAdmin()

    // Delete all user data from Supabase in dependency order
    await sb.from('training_feedback').delete().eq('scan_id', userId) // best-effort
    await sb.from('scans').delete().eq('user_id', userId)
    await sb.from('api_keys').delete().eq('user_id', userId)
    await sb.from('profiles').delete().eq('id', userId)

    // Delete Clerk user — this invalidates all sessions automatically
    const clerk = await clerkClient()
    await clerk.users.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[delete-account]', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
