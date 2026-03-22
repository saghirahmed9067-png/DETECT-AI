import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFeedbackCorrection, resolveCorrectLabel } from '@/lib/inference/feedback-learning'

export const dynamic    = 'force-dynamic'
export const maxDuration = 30

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase config')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const { feedback } = await req.json() as { feedback: 'correct' | 'incorrect' }
    if (!['correct', 'incorrect'].includes(feedback)) {
      return NextResponse.json({ success: false, error: 'Invalid feedback value' }, { status: 400 })
    }

    const db = getDb()

    // 1. Update scan record in Supabase
    const { error: updateErr } = await db
      .from('scans')
      .update({ user_feedback: feedback })
      .eq('id', id)

    if (updateErr) throw updateErr

    // 2. Fetch full scan to get signal data for learning
    const { data: scan } = await db
      .from('scans')
      .select('id, media_type, verdict, confidence_score, signals')
      .eq('id', id)
      .single()

    if (scan?.signals && Array.isArray(scan.signals)) {
      const correctLabel = resolveCorrectLabel(scan.verdict ?? 'UNCERTAIN', feedback)

      // 3. Write correction to Cloudflare D1 (non-blocking — don't fail the request)
      writeFeedbackCorrection(
        scan.id,
        scan.media_type ?? 'text',
        scan.verdict    ?? 'UNCERTAIN',
        correctLabel,
        scan.confidence_score ?? 0.5,
        scan.signals as { name: string; score: number; weight: number }[],
        feedback,
      ).catch(() => {/* non-fatal */})
    }

    return NextResponse.json({ success: true, feedback })

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    )
  }
}
