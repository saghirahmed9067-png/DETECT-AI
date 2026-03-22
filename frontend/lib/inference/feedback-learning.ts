/**
 * Aiscern — Feedback Learning Engine
 *
 * Reads correction weights from Cloudflare D1 (via REST API).
 * Applied at inference time to nudge scores based on accumulated user feedback.
 *
 * Flow:
 *   User gives feedback → /api/scan/[id]/feedback writes to D1
 *   CF Worker aggregates corrections hourly into correction_weights table
 *   This module reads correction_weights (cached 1h) and applies to raw scores
 *
 * Effect:
 *   If users consistently say "model said HUMAN but it's actually AI"
 *   → correction_magnitude > 0 → score nudged upward → fewer missed AIs
 */

export interface CorrectionWeight {
  signal_name:    string
  ai_mean:        number
  human_mean:     number
  ai_count:       number
  human_count:    number
  correction_mag: number  // positive = nudge toward AI, negative = toward HUMAN
}

interface WeightCache {
  weights:    CorrectionWeight[]
  fetchedAt:  number
}

// In-memory cache per media type — refreshed every 60 minutes
const _cache = new Map<string, WeightCache>()
const CACHE_TTL_MS = 60 * 60 * 1000  // 1 hour

const CF_ACCOUNT  = process.env.CLOUDFLARE_ACCOUNT_ID     || ''
const D1_DB       = process.env.CLOUDFLARE_D1_DATABASE_ID || ''
const CF_TOKEN    = process.env.CLOUDFLARE_API_TOKEN       || ''
const CF_BASE     = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_DB}/query`

/**
 * Query Cloudflare D1 via REST API
 */
async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number)[] = [],
): Promise<T[]> {
  if (!CF_ACCOUNT || !D1_DB || !CF_TOKEN) return []
  try {
    const res = await fetch(CF_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CF_TOKEN}` },
      body:    JSON.stringify({ sql, params }),
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json() as { result?: { results?: T[] }[] }
    return data.result?.[0]?.results ?? []
  } catch {
    return []
  }
}

/**
 * Write a user feedback correction to D1.
 * Called by /api/scan/[id]/feedback route.
 */
export async function writeFeedbackCorrection(
  scanId:       string,
  mediaType:    string,
  modelVerdict: string,
  correctLabel: string,   // 'AI' | 'HUMAN' — opposite of model if incorrect
  confidence:   number,
  signals:      { name: string; score: number; weight: number }[],
  feedbackType: 'correct' | 'incorrect',
): Promise<void> {
  if (!CF_ACCOUNT || !D1_DB || !CF_TOKEN) return

  await d1Query(
    `INSERT INTO signal_corrections
       (scan_id, media_type, model_verdict, correct_label, confidence, signals_json, feedback_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      scanId,
      mediaType,
      modelVerdict,
      correctLabel,
      confidence,
      JSON.stringify(signals),
      feedbackType,
    ],
  )

  // Invalidate cache so next inference call picks up fresh weights
  _cache.delete(mediaType)
}

/**
 * Get correction weights for a media type (cached 1h).
 */
export async function getCorrectionWeights(
  mediaType: string,
): Promise<CorrectionWeight[]> {
  const cached = _cache.get(mediaType)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.weights
  }

  const rows = await d1Query<CorrectionWeight>(
    `SELECT signal_name, ai_mean, human_mean, ai_count, human_count, correction_mag
     FROM correction_weights
     WHERE media_type = ?
     ORDER BY ABS(correction_mag) DESC`,
    [mediaType],
  )

  _cache.set(mediaType, { weights: rows, fetchedAt: Date.now() })
  return rows
}

/**
 * Apply feedback correction weights to a raw AI score.
 *
 * @param rawScore    Raw ensemble score (0–1)
 * @param mediaType   'text' | 'image' | 'audio' | 'video'
 * @param signals     Extracted signal array from current scan
 * @returns           Corrected score (0–1), clamped
 *
 * Algorithm:
 *   For each signal, compare current scan's value to the AI/HUMAN means
 *   from historical corrections. If current scan looks like past AI
 *   corrections, nudge score toward AI (and vice versa).
 *   Max correction magnitude is capped at ±0.12 to prevent overcorrection.
 */
export async function applyFeedbackCorrection(
  rawScore:  number,
  mediaType: string,
  signals:   { name: string; score: number; weight: number }[],
): Promise<number> {
  if (!signals.length) return rawScore

  let weights: CorrectionWeight[]
  try {
    weights = await getCorrectionWeights(mediaType)
  } catch {
    return rawScore  // fail gracefully — never break inference
  }

  if (!weights.length) return rawScore

  let totalCorrection = 0
  let totalWeight     = 0

  for (const sig of signals) {
    const cw = weights.find(w => w.signal_name === sig.name)
    if (!cw) continue

    // Minimum sample threshold — don't correct on fewer than 10 examples
    const totalSamples = cw.ai_count + cw.human_count
    if (totalSamples < 10) continue

    // How far is this signal from the AI mean vs HUMAN mean?
    const distToAI    = Math.abs(sig.score - cw.ai_mean)
    const distToHuman = Math.abs(sig.score - cw.human_mean)

    // If current signal is closer to AI mean → nudge toward AI
    const directionToAI = distToAI < distToHuman ? 1 : -1

    // Correction magnitude from historical data, weighted by signal reliability
    const signalCorrection = cw.correction_mag * directionToAI * sig.weight

    totalCorrection += signalCorrection
    totalWeight     += sig.weight
  }

  if (totalWeight === 0) return rawScore

  // Normalize correction and cap at ±0.12
  const normalizedCorrection = totalCorrection / totalWeight
  const cappedCorrection     = Math.max(-0.12, Math.min(0.12, normalizedCorrection))

  return Math.max(0.01, Math.min(0.99, rawScore + cappedCorrection))
}

/**
 * Determine the correct label from feedback.
 * If user says "incorrect", the correct label is opposite of model verdict.
 * If user says "correct", the correct label matches model verdict.
 */
export function resolveCorrectLabel(
  modelVerdict: string,
  feedbackType: 'correct' | 'incorrect',
): 'AI' | 'HUMAN' {
  if (feedbackType === 'correct') {
    return modelVerdict === 'AI' ? 'AI' : 'HUMAN'
  }
  // incorrect: flip the verdict
  return modelVerdict === 'AI' ? 'HUMAN' : 'AI'
}
