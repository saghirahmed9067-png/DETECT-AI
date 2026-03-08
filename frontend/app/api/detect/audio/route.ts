import { NextRequest, NextResponse } from 'next/server'
import { analyzeWithClaude, checkRateLimit } from '@/lib/inference/claude-analyze'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' } }, { status: 429 })
  }

  const start = Date.now()
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) return NextResponse.json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } }, { status: 400 })
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ success: false, error: { code: 'TOO_LARGE', message: 'Audio must be under 25MB' } }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown'
    const durationEstimate = Math.round(file.size / (128 * 1024 / 8))

    const result = await analyzeWithClaude(
      `Audio file analysis: name="${file.name}", format=${ext}, size=${(file.size / 1024 / 1024).toFixed(2)}MB, estimated_duration_seconds=${durationEstimate}`,
      'audio',
      `Generate ${Math.min(10, Math.ceil(durationEstimate / 5))} segment_scores covering the full duration. Each segment is ~5 seconds.`
    )

    return NextResponse.json({
      success: true,
      data: { ...result, processing_time: Date.now() - start, file_name: file.name, file_size: file.size, metadata: { format: ext, estimated_duration_sec: durationEstimate } },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: 'ANALYSIS_FAILED', message: err instanceof Error ? err.message : 'Analysis failed' } }, { status: 500 })
  }
}
