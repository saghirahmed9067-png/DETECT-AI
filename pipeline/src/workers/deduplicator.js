import { db } from '../db.js'
import { logger } from '../logger.js'

export async function runDeduplicator(job) {
  logger.info('Deduplicator started')
  let kept = 0, removed = 0

  // For text: deduplicate on exact hash match
  const { data: items } = await db
    .from('dataset_items')
    .select('id, perceptual_hash, media_type')
    .not('perceptual_hash', 'is', null)
    .order('created_at', { ascending: true })

  if (!items) return { kept: 0, removed: 0 }

  const seen = new Set()
  const dups = []

  for (const item of items) {
    if (seen.has(item.perceptual_hash)) {
      dups.push(item.id)
      removed++
    } else {
      seen.add(item.perceptual_hash)
      kept++
    }
  }

  // Delete duplicates in batches
  for (let i = 0; i < dups.length; i += 100) {
    await db.from('dataset_items').delete().in('id', dups.slice(i, i + 100))
  }

  logger.info('Deduplicator complete', { kept, removed })
  return { kept, removed }
}
