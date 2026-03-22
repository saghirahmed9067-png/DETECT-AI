/**
 * Aiscern — Correction Weights Aggregator
 * 
 * Runs every hour via cron trigger.
 * Reads signal_corrections table and recomputes correction_weights
 * so the inference engine always has up-to-date learning signals.
 *
 * Algorithm:
 *   For each (media_type, signal_name) pair:
 *     - Compute mean signal score when correct_label = 'AI'
 *     - Compute mean signal score when correct_label = 'HUMAN'
 *     - correction_mag = (ai_mean - human_mean) * confidence_factor
 *
 *   Minimum 10 samples required before any correction is applied.
 *   Scores from the last 90 days only (prevents stale data from skewing).
 */

export async function aggregateCorrectionWeights(db: D1Database): Promise<void> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Get all media types that have corrections
  const { results: mediaTypes } = await db
    .prepare(`SELECT DISTINCT media_type FROM signal_corrections WHERE created_at > ?`)
    .bind(cutoff)
    .all<{ media_type: string }>()

  for (const { media_type } of mediaTypes ?? []) {
    // Get all corrections for this media type
    const { results: corrections } = await db
      .prepare(
        `SELECT correct_label, signals_json
         FROM signal_corrections
         WHERE media_type = ? AND created_at > ?
         ORDER BY created_at DESC
         LIMIT 5000`
      )
      .bind(media_type, cutoff)
      .all<{ correct_label: string; signals_json: string }>()

    if (!corrections?.length) continue

    // Aggregate per signal name
    const signalStats = new Map<string, {
      ai_scores:    number[]
      human_scores: number[]
    }>()

    for (const row of corrections) {
      let signals: { name: string; score: number; weight: number }[]
      try {
        signals = JSON.parse(row.signals_json)
      } catch { continue }

      for (const sig of signals) {
        if (!signalStats.has(sig.name)) {
          signalStats.set(sig.name, { ai_scores: [], human_scores: [] })
        }
        const stat = signalStats.get(sig.name)!
        if (row.correct_label === 'AI')    stat.ai_scores.push(sig.score)
        if (row.correct_label === 'HUMAN') stat.human_scores.push(sig.score)
      }
    }

    // Compute weights and upsert
    const stmts: D1PreparedStatement[] = []
    for (const [signal_name, stats] of signalStats) {
      const ai_count    = stats.ai_scores.length
      const human_count = stats.human_scores.length

      // Require minimum 10 samples to avoid noise
      if (ai_count + human_count < 10) continue

      const ai_mean    = ai_count    > 0 ? stats.ai_scores.reduce((a, b) => a + b, 0) / ai_count       : 0.5
      const human_mean = human_count > 0 ? stats.human_scores.reduce((a, b) => a + b, 0) / human_count : 0.5

      // confidence_factor: more samples = more confident correction
      // Approaches 1.0 asymptotically as sample count grows
      const totalSamples      = ai_count + human_count
      const confidence_factor = Math.min(1, totalSamples / 200)

      // correction_mag: how much to nudge score toward AI
      // Positive = AI signal, Negative = HUMAN signal
      const raw_mag      = (ai_mean - human_mean) * 0.5  // scale to ±0.5 max
      const correction_mag = raw_mag * confidence_factor  // scale by confidence

      stmts.push(
        db.prepare(
          `INSERT INTO correction_weights
             (media_type, signal_name, ai_mean, human_mean, ai_count, human_count, correction_mag, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(media_type, signal_name)
           DO UPDATE SET
             ai_mean        = excluded.ai_mean,
             human_mean     = excluded.human_mean,
             ai_count       = excluded.ai_count,
             human_count    = excluded.human_count,
             correction_mag = excluded.correction_mag,
             updated_at     = excluded.updated_at`
        ).bind(media_type, signal_name, ai_mean, human_mean, ai_count, human_count, correction_mag)
      )
    }

    // Batch write all weight updates
    if (stmts.length > 0) {
      await db.batch(stmts)
      console.log(`[weights-aggregator] ${media_type}: updated ${stmts.length} signal weights`)
    }
  }
}
