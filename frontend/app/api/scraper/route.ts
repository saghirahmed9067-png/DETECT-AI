import { NextRequest, NextResponse } from 'next/server'
import { analyzeText, checkRateLimit } from '@/lib/inference/hf-analyze'
import { creditGuard, httpErrorResponse, HTTPError } from '@/lib/middleware/credit-guard'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

async function fetchWebContent(url: string): Promise<{ html: string; text: string; title: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Aiscern/1.0; AI Content Detector)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const html = await res.text()

  // Extract clean text - strip HTML tags, scripts, styles, nav, footer
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : url

  return { html, text, title }
}

function extractParagraphs(text: string): string[] {
  // Split into meaningful content blocks (50+ chars)
  return text
    .split(/[.\n]{2,}/)
    .map(p => p.trim())
    .filter(p => p.length >= 60 && p.split(' ').length >= 8)
    .slice(0, 30)  // Analyze up to 30 paragraphs
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip, 5)) {
    return NextResponse.json({ success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } }, { status: 429 })
  }

  let userId: string
  try {
    const guard = await creditGuard(req, 'text')
    userId = guard.userId
  } catch (err) {
    if (err instanceof HTTPError) return httpErrorResponse(err)
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Request failed' } }, { status: 500 })
  }

  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: { code: 'NO_URL', message: 'URL is required' } }, { status: 400 })
    }

    // Validate URL
    let parsed: URL
    try { parsed = new URL(url) } catch {
      return NextResponse.json({ success: false, error: { code: 'INVALID_URL', message: 'Invalid URL format' } }, { status: 400 })
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_URL', message: 'Only HTTP/HTTPS URLs allowed' } }, { status: 400 })
    }

    // Fetch content
    const { text, title } = await fetchWebContent(url)
    if (text.length < 100) {
      return NextResponse.json({ success: false, error: { code: 'NO_CONTENT', message: 'Could not extract text from this page. It may require JavaScript or be behind a login.' } }, { status: 422 })
    }

    // Extract paragraphs and analyze each
    const paragraphs = extractParagraphs(text)
    if (!paragraphs.length) {
      return NextResponse.json({ success: false, error: { code: 'NO_CONTENT', message: 'No analyzable text paragraphs found on this page.' } }, { status: 422 })
    }

    // Analyze up to 10 paragraphs concurrently
    const toAnalyze = paragraphs.slice(0, 10)
    const results = await Promise.allSettled(
      toAnalyze.map(p => analyzeText(p))
    )

    const scored = results
      .map((r, i) => ({
        text: toAnalyze[i].slice(0, 200) + (toAnalyze[i].length > 200 ? '…' : ''),
        verdict: r.status === 'fulfilled' ? r.value.verdict : 'UNCERTAIN' as const,
        confidence: r.status === 'fulfilled' ? r.value.confidence : 0.5,
      }))

    // Weighted overall score
    const aiCount      = scored.filter(s => s.verdict === 'AI').length
    const humanCount   = scored.filter(s => s.verdict === 'HUMAN').length
    const uncertainCount = scored.filter(s => s.verdict === 'UNCERTAIN').length
    const avgAiScore   = scored.reduce((sum, s) => sum + s.confidence, 0) / scored.length
    const aiPct        = Math.round((aiCount / scored.length) * 100)
    const humanPct     = Math.round((humanCount / scored.length) * 100)
    const mixedPct     = Math.round((uncertainCount / scored.length) * 100)

    const overallVerdict =
      aiPct >= 60 ? 'AI' :
      humanPct >= 60 ? 'HUMAN' : 'MIXED'

    return NextResponse.json({
      success: true,
      result: {
        url,
        title,
        totalChars: text.length,
        paragraphsAnalyzed: scored.length,
        totalParagraphs: paragraphs.length,
        overallVerdict,
        overallConfidence: Math.round(avgAiScore * 100),
        aiPct,
        humanPct,
        mixedPct,
        paragraphs: scored,
        summary: overallVerdict === 'AI'
          ? `${aiPct}% of the content on this page appears to be AI-generated. ${aiCount} out of ${scored.length} analyzed paragraphs show strong AI indicators.`
          : overallVerdict === 'HUMAN'
          ? `${humanPct}% of the content appears to be human-written. ${humanCount} out of ${scored.length} analyzed paragraphs show authentic human writing patterns.`
          : `Mixed content detected. ${aiPct}% AI, ${humanPct}% human, ${mixedPct}% uncertain across ${scored.length} analyzed paragraphs.`,
      }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scan failed'
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      return NextResponse.json({ success: false, error: { code: 'FETCH_ERROR', message: 'Could not reach that URL. Check the URL is public and accessible.' } }, { status: 422 })
    }
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: msg } }, { status: 500 })
  }
}
