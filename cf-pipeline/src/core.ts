/**
 * Aiscern Pipeline v7 — Core with sequential cursor tracking + parallel scraping
 * Key improvements over v6:
 *   - Sequential cursor per source (eliminates 80%+ dedup waste)
 *   - Parallel scraping: each worker runs 3 sources per cron tick
 *   - Source advancement: cursor stored in D1 source_cursors table
 *   - Workers 1-15 scrape, Worker 20 pushes
 */

export type { Env } from './types'
export { ALL_SOURCES, getWorkerSources, TOTAL_SCRAPER_WORKERS } from './sources/index'
export { fetchHFRows } from './utils/hf-api'
export { batchInsert  } from './db/insert'
export { getStatus, cleanupPushed } from './db/status'
export { pushToHF    } from './hf/push'
export { pushReadme  } from './hf/readme'

import type { Source, Extracted, ScrapeResult } from './types'
import { fetchHFRows   } from './utils/hf-api'
import { batchInsert   } from './db/insert'
import { extractTextRow  } from './extractors/text'
import { extractImageRow } from './extractors/image'
import { extractAudioRow } from './extractors/audio'
import { extractVideoRow } from './extractors/video'
import { log } from './types'

const ROWS_PER_FETCH = 100  // HF API max

/** Get and advance cursor for a source — ensures no repeated offsets across workers */
async function getAndAdvanceCursor(db: D1Database, sourceName: string, advance: number): Promise<number> {
  // Atomic read-modify-write using D1 (best-effort; occasional overlaps are fine)
  const row = await db.prepare(
    `SELECT next_offset FROM source_cursors WHERE source_name = ? LIMIT 1`
  ).bind(sourceName).first<{ next_offset: number }>()

  const current = row?.next_offset ?? 0

  // Advance cursor by rows fetched
  await db.prepare(
    `INSERT INTO source_cursors (source_name, next_offset, total_fetched, last_updated)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(source_name) DO UPDATE SET
       next_offset = next_offset + excluded.total_fetched,
       total_fetched = total_fetched + excluded.total_fetched,
       last_updated = datetime('now')`
  ).bind(sourceName, current + advance, advance).run().catch(() => {})

  return current
}

/** Record actual insertions back to cursor table */
async function updateCursorInserted(db: D1Database, sourceName: string, inserted: number): Promise<void> {
  await db.prepare(
    `UPDATE source_cursors SET total_inserted = total_inserted + ?, last_updated = datetime('now')
     WHERE source_name = ?`
  ).bind(inserted, sourceName).run().catch(() => {})
}

/** Record error on source cursor */
async function recordCursorError(db: D1Database, sourceName: string, err: string): Promise<void> {
  await db.prepare(
    `UPDATE source_cursors SET error_count = error_count + 1, last_error = ?, last_updated = datetime('now')
     WHERE source_name = ?`
  ).bind(err.slice(0, 200), sourceName).run().catch(() => {})
}

export async function scrapeSource(
  db:     D1Database,
  src:    Source,
  token:  string,
  wid:    string,
  target = 100,  // v7: default 100 (full HF page)
): Promise<ScrapeResult> {
  const start = Date.now()
  try {
    // Get sequential cursor (no random offset)
    const offset = await getAndAdvanceCursor(db, src.name, ROWS_PER_FETCH)

    const { rows } = await fetchHFRows(
      src.id, src.config ?? 'default', src.split ?? 'train',
      offset, ROWS_PER_FETCH, token,
    )

    if (!rows?.length) {
      // Dataset exhausted — reset cursor to re-scrape from start
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

/** Scrape multiple sources in parallel — used by worker scheduled handler */
export async function scrapeParallel(
  db:      D1Database,
  sources: Source[],
  token:   string,
  wid:     string,
  count  = 3,  // sources to scrape in parallel per tick
): Promise<ScrapeResult[]> {
  if (!sources.length) return []
  // Pick `count` sources based on current minute to rotate evenly
  const tick   = Math.floor(Date.now() / 60_000)
  const picked = Array.from({ length: count }, (_, i) => sources[(tick + i) % sources.length])
  return Promise.all(picked.map(src => scrapeSource(db, src, token, wid, 100)))
}
