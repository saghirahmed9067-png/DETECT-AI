import { NextRequest, NextResponse } from 'next/server'
import { analyzeWithClaude, checkRateLimit } from '@/lib/inference/claude-analyze'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded. Try again in 10 minutes.', retryAfter: 600 } }, { status: 429 })
  }

  const start = Date.now()
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) return NextResponse.json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ success: false, error: { code: 'INVALID_TYPE', message: 'File must be an image' } }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ success: false, error: { code: 'TOO_LARGE', message: 'Image must be under 10MB' } }, { status: 400 })

    const bytes  = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const result = await analyzeWithClaude(
      { type: 'image', base64, mimeType: file.type },
      'image',
      `File: ${file.name}, Size: ${(file.size / 1024).toFixed(1)}KB, Type: ${file.type}`
    )

    return NextResponse.json({
      success: true,
      data: { ...result, processing_time: Date.now() - start, file_name: file.name, file_size: file.size },
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: 'ANALYSIS_FAILED', message: err instanceof Error ? err.message : 'Analysis failed' }
    }, { status: 500 })
  }
}
