import { NextRequest, NextResponse } from 'next/server'
import { analyzeWithClaude, checkRateLimit } from '@/lib/inference/claude-analyze'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded', retryAfter: 600 } }, { status: 429 })
  }

  const start = Date.now()
  try {
    const body = await req.json()
    const { text } = body

    if (!text || typeof text !== 'string') return NextResponse.json({ success: false, error: { code: 'NO_TEXT', message: 'No text provided' } }, { status: 400 })
    if (text.length < 50)  return NextResponse.json({ success: false, error: { code: 'TOO_SHORT', message: 'Text must be at least 50 characters' } }, { status: 400 })
    if (text.length > 10000) return NextResponse.json({ success: false, error: { code: 'TOO_LONG', message: 'Text must be under 10,000 characters' } }, { status: 400 })

    const result = await analyzeWithClaude(text, 'text')

    return NextResponse.json({
      success: true,
      data: { ...result, processing_time: Date.now() - start },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: 'ANALYSIS_FAILED', message: err instanceof Error ? err.message : 'Analysis failed' } }, { status: 500 })
  }
}
