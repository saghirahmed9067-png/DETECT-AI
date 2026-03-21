import { NextRequest, NextResponse } from 'next/server'
import { analyzeText, checkRateLimit } from '@/lib/inference/hf-analyze'
import { creditGuard, httpErrorResponse, HTTPError } from '@/lib/middleware/credit-guard'
import { sanitizeText } from '@/lib/utils/sanitize'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60   // 60s — HF model warm-up can take 20-30s

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (!checkRateLimit(ip, 30)) {
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait and try again.' } },
      { status: 429 }
    )
  }

  const internalSecret = req.headers.get('X-Internal-Secret')
  const isInternal = internalSecret && internalSecret === process.env.INTERNAL_API_SECRET

  let userId: string
  if (isInternal) {
    userId = 'internal'
  } else {
    try {
      const guard = await creditGuard(req, 'text')
      userId = guard.userId
    } catch (err) {
      if (err instanceof HTTPError) return httpErrorResponse(err)
      return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Request failed' } }, { status: 500 })
    }
  }

  const start = Date.now()
  try {
    const body = await req.json().catch(() => ({}))
    const { text } = body

    if (!text || typeof text !== 'string')
      return NextResponse.json({ success: false, error: { code: 'NO_TEXT', message: 'No text provided' } }, { status: 400 })
    if (text.length < 50)
      return NextResponse.json({ success: false, error: { code: 'TOO_SHORT', message: 'Text must be at least 50 characters' } }, { status: 400 })
    if (text.length > 10000)
      return NextResponse.json({ success: false, error: { code: 'TOO_LONG', message: 'Text must be under 10,000 characters' } }, { status: 400 })

    const result = await analyzeText(text)
    const processingTime = Date.now() - start

    // Save scan to Supabase only for real signed-in users (not anon_, not internal)
    let scanId: string | null = null
    if (userId !== 'internal' && !userId.startsWith('anon_')) {
      try {
        const { data: scanRow } = await getSupabaseAdmin().from('scans').insert({
          user_id:          userId,
          media_type:       'text',
          content_preview:  text.substring(0, 500),
          verdict:          result.verdict,
          confidence_score: result.confidence,
          signals:          result.signals,
          processing_time:  processingTime,
          model_used:       result.model_used,
          model_version:    result.model_version,
          status:           'complete',
          metadata:         { char_count: text.length, word_count: text.split(/\s+/).length },
        }).select('id').single()
        scanId = scanRow?.id ?? null
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true, scan_id: scanId, result: { ...result, processing_time: processingTime } })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'ANALYSIS_FAILED', message: err instanceof Error ? err.message : 'Analysis failed' } },
      { status: 500 }
    )
  }
}
