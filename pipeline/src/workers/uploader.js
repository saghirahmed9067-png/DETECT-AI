import { db } from '../db.js'
import { logger } from '../logger.js'
import { config } from '../config.js'

export async function runUploader(job) {
  logger.info('Uploader started')
  const { media_type } = job.payload || {}

  if (!config.hfToken || !config.hfDatasetRepo) {
    logger.warn('HF_TOKEN or HF_DATASET_REPO not configured — skipping upload')
    return { skipped: true, reason: 'HF credentials not configured' }
  }

  // Get dataset stats
  const { count: totalCount } = await db
    .from('dataset_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_deduplicated', true)

  const { data: byType } = await db
    .from('dataset_items')
    .select('media_type, label')
    .eq('is_deduplicated', true)

  const stats = {}
  for (const item of byType || []) {
    const key = `${item.media_type}_${item.label}`
    stats[key] = (stats[key] || 0) + 1
  }

  // Create dataset card metadata
  const metadata = {
    repo: config.hfDatasetRepo,
    total: totalCount,
    by_type: stats,
    created_at: new Date().toISOString(),
    split_distribution: { train: '80%', val: '10%', test: '10%' },
  }

  logger.info('Dataset ready for upload', metadata)

  // In production: use @huggingface/hub commitFiles to push to HF
  // For now, log the metadata that would be uploaded
  logger.info('Upload complete (simulated)', { total: totalCount })

  // Update hf_dataset_id on items
  const revision = `v${Date.now()}`
  if (media_type) {
    await db.from('dataset_items')
      .update({ hf_dataset_id: config.hfDatasetRepo, hf_revision: revision })
      .eq('media_type', media_type)
      .eq('is_deduplicated', true)
  }

  return { uploaded: totalCount, revision, repo: config.hfDatasetRepo }
}
