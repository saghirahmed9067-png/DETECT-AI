/**
 * Public REST API — POST /api/v1/detect/text
 * Requires: api_keys table in Supabase (see /supabase/migrations/001_create_api_keys.sql)
 * Auth: SHA-256 hashed key stored in api_keys.key_hash — never stored in plaintext
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash }                from 'crypto'
import { analyzeText, checkRateLimit } from '@/lib/inference/hf-analyze'
import { getSupabaseAdmin }          from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Header presence check ───────────────────────────────────
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey.trim().length < 8) {
      return NextResponse.json(
        { error: 'X-API-Key header required. Get your key at aiscern.com/settings', docs: 'https://aiscern.com/docs/api' },
        { status: 401 }
      )
    }

    // ── Step 2: Validate key against Supabase api_keys table ────────────
    const db = getSupabaseAdmin()
    const { data: keyRow, error: keyError } = await db
      .from('api_keys')
      .select('user_id, plan, monthly_limit, usage_count, usage_reset_at, active')
      .eq('key_hash', hashKey(apiKey))
      .single()

    if (keyError || !keyRow || !keyRow.active) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key. Get yours at aiscern.com/settings', docs: 'https://aiscern.com/docs/api' },
        { status: 401 }
      )
    }

    // ── Step 3: Monthly usage limit check ───────────────────────────────
    if (keyRow.monthly_limit !== null && keyRow.usage_count >= keyRow.monthly_limit) {
      const resetDate = keyRow.usage_reset_at
        ? new Date(keyRow.usage_reset_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        : 'next month'
      return NextResponse.json(
        { error: `Monthly limit of ${keyRow.monthly_limit} requests reached. Resets ${resetDate}.` },
        { status: 429 }
      )
    }

    // ── Step 4: IP rate limit (secondary protection) ─────────────────────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    if (!checkRateLimit(ip, 60)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 60 requests/minute.' }, { status: 429 })
    }

    // ── Step 5: Increment usage count (non-blocking fire-and-forget) ─────
    db.from('api_keys')
      .update({
        usage_count:  keyRow.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('key_hash', hashKey(apiKey))
      .then(() => {})
      .catch(() => {})

    // ── Step 6: Validate request body ────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const { text } = body

    if (!text || typeof text !== 'string' || text.length < 50)
      return NextResponse.json({ error: 'text must be at least 50 characters' }, { status: 400 })
    if (text.length > 10000)
      return NextResponse.json({ error: 'text must be under 10,000 characters' }, { status: 400 })

    // ── Step 7: Run detection ─────────────────────────────────────────────
    const start  = Date.now()
    const result = await analyzeText(text)

    return NextResponse.json({
      verdict:         result.verdict,
      confidence:      result.confidence,
      signals:         result.signals,
      summary:         result.summary,
      processing_time: Date.now() - start,
      model:           result.model_used,
    })

  } catch (err: any) {
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
