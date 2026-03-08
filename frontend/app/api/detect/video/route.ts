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
    if (file.size > 100 * 1024 * 1024) return NextResponse.json({ success: false, error: { code: 'TOO_LARGE', message: 'Video must be under 100MB' } }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const fpsEstimate = 24
    const durationEstimate = Math.round(file.size / (1024 * 1024 * 5))
    const frameCount = Math.min(20, durationEstimate * fpsEstimate)

    const result = await analyzeWithClaude(
      `Video file analysis: name="${file.name}", format=${ext}, size=${(file.size / 1024 / 1024).toFixed(1)}MB, estimated_duration_seconds=${durationEstimate}`,
      'video',
      `Generate ${Math.min(20, Math.ceil(durationEstimate * 2))} frame_scores distributed across the video duration at equal intervals.`
    )

    return NextResponse.json({
      success: true,
      data: { ...result, processing_time: Date.now() - start, file_name: file.name, file_size: file.size, metadata: { format: ext, estimated_duration_sec: durationEstimate, estimated_frames: frameCount } },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: 'ANALYSIS_FAILED', message: err instanceof Error ? err.message : 'Analysis failed' } }, { status: 500 })
  }
}
