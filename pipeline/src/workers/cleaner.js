import { db } from '../db.js'
import { logger } from '../logger.js'
import crypto from 'crypto'

const BATCH_SIZE = 500

function cleanText(text) {
  if (!text) return null
  return text
    .replace(/<[^>]+>/g, ' ')     // strip HTML
    .replace(/\s+/g, ' ')          // normalize whitespace
    .replace(/[\x00-\x1F\x7F]/g, '') // strip control chars
    .trim()
}

function isValidText(text) {
  return text && text.length >= 100 && text.split(' ').length >= 15
}

export async function runCleaner(job) {
  logger.info('Cleaner worker started')
  const { media_type } = job.payload || {}

  let cleaned  = 0
  let rejected = 0
  let offset   = 0

  while (true) {
    const query = db.from('dataset_items')
      .select('*')
      .eq('is_deduplicated', false)
      .range(offset, offset + BATCH_SIZE - 1)

    if (media_type) query.eq('media_type', media_type)

    const { data: items, error } = await query

    if (error) { logger.error('Fetch error', { error: error.message }); break }
    if (!items?.length) break

    logger.info(`Processing batch of ${items.length} items`)

    for (const item of items) {
      try {
        let valid = true
        const updates = { is_deduplicated: true }

        if (item.media_type === 'text') {
          const cleaned_text = cleanText(item.file_path || item.metadata?.text)
          if (!isValidText(cleaned_text)) {
            valid = false
          } else {
            // compute content hash for dedup
            updates.perceptual_hash = crypto.createHash('sha256').update(cleaned_text).digest('hex')
            updates.metadata = { ...item.metadata, cleaned_at: new Date().toISOString() }
          }
        } else {
          // For images/audio/video: mark as processed (actual processing needs runtime libs)
          updates.metadata = { ...item.metadata, cleaned_at: new Date().toISOString() }
        }

        if (!valid) {
          await db.from('dataset_items').delete().eq('id', item.id)
          rejected++
        } else {
          await db.from('dataset_items').update(updates).eq('id', item.id)
          cleaned++
        }
      } catch (err) {
        logger.error(`Clean failed for ${item.id}`, { error: err.message })
        rejected++
      }
    }

    offset += BATCH_SIZE
    if (items.length < BATCH_SIZE) break
  }

  logger.info(`Cleaner complete`, { cleaned, rejected })
  return { cleaned, rejected }
}
