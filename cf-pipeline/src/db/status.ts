export async function getStatus(db: D1Database) {
  const [st, ct, ql, sr, pl] = await db.batch([
    db.prepare('SELECT * FROM pipeline_state WHERE id = 1'),
    db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN media_type='text'  THEN 1 ELSE 0 END) as text_count,
        SUM(CASE WHEN media_type='image' THEN 1 ELSE 0 END) as image_count,
        SUM(CASE WHEN media_type='audio' THEN 1 ELSE 0 END) as audio_count,
        SUM(CASE WHEN media_type='video' THEN 1 ELSE 0 END) as video_count,
        SUM(CASE WHEN label='ai'         THEN 1 ELSE 0 END) as ai_count,
        SUM(CASE WHEN label='human'      THEN 1 ELSE 0 END) as human_count,
        -- pushed count is in pipeline_state.total_pushed (rows deleted after push)
        0 as pushed_in_table,
        COUNT(*) as pending,  -- all rows in table are unpushed (deleted immediately after push)
        SUM(CASE WHEN split='train' THEN 1 ELSE 0 END) as train_count,
        SUM(CASE WHEN split='val'   THEN 1 ELSE 0 END) as val_count,
        SUM(CASE WHEN split='test'  THEN 1 ELSE 0 END) as test_count
      FROM dataset_items
    `),
    db.prepare(`
      SELECT
        ROUND(AVG(quality_score), 3) as avg_quality,
        ROUND(AVG(CASE WHEN media_type='text'  THEN word_count       END), 0) as avg_words,
        ROUND(AVG(CASE WHEN media_type='audio' THEN duration_seconds END), 1) as avg_audio_s,
        ROUND(AVG(CASE WHEN media_type='image' THEN resolution_w * resolution_h END), 0) as avg_pixels
      FROM dataset_items
    `),
    db.prepare(`
      SELECT source_name, media_type, label, COUNT(*) as count
      FROM dataset_items
      GROUP BY source_name, media_type, label
      ORDER BY count DESC
      LIMIT 25
    `),
    db.prepare(`
      SELECT item_count, commit_id, status, error, created_at
      FROM hf_push_log
      ORDER BY created_at DESC
      LIMIT 10
    `),
  ])

  return {
    pipeline:     'Aiscern Neural Pipeline v6 — Modular 20-Worker Edition',
    version:      'v6.0',
    data_mode:    'REAL (HuggingFace Datasets API)',
    hf_structure: 'data/{media_type}/{language}/part-NNNN.jsonl',
    state:        st.results[0],
    dataset:      ct.results[0],
    quality:      ql.results[0],
    top_sources:  sr.results,
    recent_pushes: pl.results,
  }
}

/**
 * Safety-net cleanup — two passes:
 *
 * Pass 1 (orphan guard): rows older than 2 hours are assumed pushed-but-not-deleted
 *   (worker crashed mid-delete). push.ts deletes rows immediately after HF commit,
 *   so any row sitting for 2h+ without being pushed is stale data.
 *   NOTE: hf_pushed_at is never set in push.ts (rows are deleted directly),
 *   so the old hf_pushed_at IS NOT NULL check would never match — fixed here.
 *
 * Pass 2 (push log trim): keep only the last 500 push log entries to prevent
 *   hf_push_log from growing unboundedly (used for shard part-number counting).
 */
export async function cleanupPushed(db: D1Database): Promise<number> {
  // Pass 1: delete rows older than 2 hours (orphaned by crashed worker mid-delete)
  const stale = await db.prepare(`
    DELETE FROM dataset_items
    WHERE created_at < datetime('now', '-2 hours')
  `).run().catch(() => ({ meta: { changes: 0 } }))

  // Pass 2: trim hf_push_log — keep last 500 rows per repo
  await db.prepare(`
    DELETE FROM hf_push_log
    WHERE id NOT IN (
      SELECT id FROM hf_push_log
      ORDER BY created_at DESC
      LIMIT 500
    )
  `).run().catch(() => {})

  return stale.meta?.changes ?? 0
}
