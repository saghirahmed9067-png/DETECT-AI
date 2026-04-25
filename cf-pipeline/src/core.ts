/**
 * Aiscern Pipeline v8 — Core scraping engine
 * Fixes over v7:
 *   - Run ALL assigned sources per tick (not just 3)
 *   - Per-worker time-based jitter so workers don't all hit same source simultaneously
 *   - Skip dead sources (404/timeout) and sources in cooldown (>600 errors)
 *   - 429 now retries properly (handled in hf-api.ts)
 *   - Staggered parallel execution with small delays between sources
 */

export type { Env } from './types'
export { ALL_SOURCES, getWorkerSources, TOTAL_SCRAPER_WORKERS } from './sources/index'
export { fetchHFRows } from './utils/hf-api'
export { batchInsert  } from './db/insert'
export { getStatus, cleanupPushed } from './db/status'
export { pushToHF    } from './hf/push'
export { pushReadme  } from './hf/readme'

import type { Source, Extracted, ScrapeResult } from './types'
import { fetchHFRows, DEAD_SOURCES, MAX_ERRORS_BEFORE_COOLDOWN } from './utils/hf-api'
import { batchInsert   } from './db/insert'
import { extractTextRow  } from './extractors/text'
import { extractImageRow } from './extractors/image'
import { extractAudioRow } from './extractors/audio'
import { extractVideoRow } from './extractors/video'
import { log } from './types'

const ROWS_PER_FETCH = 100

async function getAndAdvanceCursor(db: D1Database, sourceName: string, advance: number): Promise<number> {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS source_cursors (
        source_name     TEXT PRIMARY KEY,
        next_offset     INTEGER NOT NULL DEFAULT 0,
        total_fetched   INTEGER NOT NULL DEFAULT 0,
        total_inserted  INTEGER NOT NULL DEFAULT 0,
        error_count     INTEGER NOT NULL DEFAULT 0,
        last_error      TEXT,
        last_updated    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run().catch(() => {})

    const row = await db.prepare(
      `SELECT next_offset FROM source_cursors WHERE source_name = ? LIMIT 1`
    ).bind(sourceName).first<{ next_offset: number }>()

    const current = row?.next_offset ?? 0

    await db.prepare(
      `INSERT INTO source_cursors (source_name, next_offset, total_fetched, last_updated)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(source_name) DO UPDATE SET
         next_offset = next_offset + excluded.total_fetched,
         total_fetched = total_fetched + excluded.total_fetched,
         last_updated = datetime('now')`
    ).bind(sourceName, current + advance, advance).run().catch(() => {})

    return current
  } catch {
    return 0
  }
}

async function updateCursorInserted(db: D1Database, sourceName: string, inserted: number): Promise<void> {
  await db.prepare(
    `UPDATE source_cursors SET total_inserted = total_inserted + ?, last_updated = datetime('now')
     WHERE source_name = ?`
  ).bind(inserted, sourceName).run().catch(() => {})
}

async function recordCursorError(db: D1Database, sourceName: string, err: string): Promise<void> {
  await db.prepare(
    `UPDATE source_cursors SET error_count = error_count + 1, last_error = ?, last_updated = datetime('now')
     WHERE source_name = ?`
  ).bind(err.slice(0, 200), sourceName).run().catch(() => {})
}

/** Check if a source should be skipped (dead or in cooldown) */
async function shouldSkipSource(db: D1Database, src: Source): Promise<string | null> {
  // Hard-coded dead sources — always skip
  if (DEAD_SOURCES.has(src.name)) return `DEAD source: ${src.name}`

  // Check error count in DB — skip sources in cooldown
  try {
    const row = await db.prepare(
      `SELECT error_count, last_error FROM source_cursors WHERE source_name = ? LIMIT 1`
    ).bind(src.name).first<{ error_count: number; last_error: string | null }>()

    if (row && row.error_count >= MAX_ERRORS_BEFORE_COOLDOWN) {
      // Dead-source check: if last error is 404, skip permanently
      if (row.last_error?.includes('DEAD:404') || row.last_error?.includes('does not exist')) {
        return `PERM_DEAD: ${src.name} (${row.error_count} 404 errors)`
      }
      // Rate limit / timeout cooldown — skip this tick, try again next minute
      return `COOLDOWN: ${src.name} (${row.error_count} errors, last: ${row.last_error?.slice(0, 60)})`
    }
  } catch {}
  return null
}

export async function scrapeSource(
  db:     D1Database,
  src:    Source,
  token:  string,
  wid:    string,
  target = 100,
): Promise<ScrapeResult> {
  const start = Date.now()

  // Skip dead/cooldown sources immediately
  const skipReason = await shouldSkipSource(db, src)
  if (skipReason) {
    log({ event: 'SKIP', worker_id: wid, source_id: src.name, reason: skipReason,
          timestamp: new Date().toISOString() })
    return { source: src.name, inserted: 0, skipped: 0, error: skipReason }
  }

  try {
    const offset = await getAndAdvanceCursor(db, src.name, ROWS_PER_FETCH)

    const { rows } = await fetchHFRows(
      src.id, src.config ?? 'default', src.split ?? 'train',
      offset, ROWS_PER_FETCH, token,
    )

    if (!rows?.length) {
      await db.prepare(
        `UPDATE source_cursors SET next_offset = 0, last_updated = datetime('now') WHERE source_name = ?`
      ).bind(src.name).run().catch(() => {})
      return { source: src.name, inserted: 0, skipped: 0 }
    }

    const d1Items: { src: Source; item: Extracted; rowIdx: number; wid: string }[] = []
    let skipped = 0

    for (const { row_idx, row } of rows) {
      if (d1Items.length >= target) break
      let extracted: Extracted | null = null
      try {
        switch (src.media_type) {
          case 'text':  extracted = await extractTextRow(row, src);            break
          case 'image': extracted = await extractImageRow(row, src, row_idx); break
          case 'audio': extracted = await extractAudioRow(row, src, row_idx); break
          case 'video': extracted = await extractVideoRow(row, src, row_idx); break
        }
      } catch {}
      if (extracted) d1Items.push({ src, item: extracted, rowIdx: row_idx, wid })
      else skipped++
    }

    const inserted = await batchInsert(db, d1Items)
    await updateCursorInserted(db, src.name, inserted)

    // Reset error count on success (source recovered from rate limit)
    if (inserted > 0) {
      await db.prepare(
        `UPDATE source_cursors SET error_count = 0, last_updated = datetime('now') WHERE source_name = ?`
      ).bind(src.name).run().catch(() => {})
    }

    log({ event: 'SCRAPE_COMPLETE', worker_id: wid, source_id: src.name,
          sample_count: inserted, duration_ms: Date.now()-start,
          timestamp: new Date().toISOString() })

    return { source: src.name, inserted, skipped: skipped + (d1Items.length - inserted) }
  } catch (e: any) {
    const errMsg = e?.message ?? 'unknown'
    await recordCursorError(db, src.name, errMsg)
    log({ event: 'ERROR', worker_id: wid, source_id: src.name, error_message: errMsg,
          duration_ms: Date.now()-start, timestamp: new Date().toISOString() })
    return { source: src.name, inserted: 0, skipped: 0, error: errMsg }
  }
}

/**
 * Scrape ALL assigned sources for this worker — staggered to avoid simultaneous HF hits.
 * FIX: was "pick 3 by tick" — every worker picked same 3 sources simultaneously.
 * Now: ALL sources run, with per-worker offset jitter (workerNum * 2000ms stagger).
 */
export async function scrapeParallel(
  db:        D1Database,
  sources:   Source[],
  token:     string,
  wid:       string,
  workerNum: number = 1,
): Promise<ScrapeResult[]> {
  if (!sources.length) return []

  // Stagger start: each worker waits workerNum * 1.5s so they don't all hit HF at t=0
  // Worker 1 starts at 0s, Worker 2 at 1.5s, Worker 3 at 3s, etc.
  // This spreads 14 workers across 21 seconds instead of all hitting at once
  const staggerMs = (workerNum - 1) * 1500
  if (staggerMs > 0) await new Promise(r => setTimeout(r, staggerMs))

  // Run ALL assigned sources — not just 3
  // Each source gets 200ms gap to further spread HF API calls
  const results: ScrapeResult[] = []
  for (let i = 0; i < sources.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 200)) // 200ms between sources
    results.push(await scrapeSource(db, sources[i], token, wid, 100))
  }
  return results
}
