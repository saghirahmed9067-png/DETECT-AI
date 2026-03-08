import pLimit from 'p-limit'
import { db } from '../db.js'
import { logger } from '../logger.js'

const limit = pLimit(3) // max 3 concurrent jobs

// Worker handlers by job type
const HANDLERS = {}

async function loadHandlers() {
  const { runScraper }     = await import('./scraper.js')
  const { runCleaner }     = await import('./cleaner.js')
  const { runDeduplicator} = await import('./deduplicator.js')
  const { runUploader }    = await import('./uploader.js')

  HANDLERS.scrape  = runScraper
  HANDLERS.clean   = runCleaner
  HANDLERS.dedupe  = runDeduplicator
  HANDLERS.upload  = runUploader
  HANDLERS.augment = async (job) => {
    logger.info('Augment job — queueing targeted scrape', { scan_id: job.payload?.scan_id })
    await db.from('pipeline_jobs').insert({
      job_type: 'scrape',
      priority: 8,
      payload:  { media_type: job.payload?.media_type, target_label: job.payload?.verdict?.toLowerCase(), limit: 100 },
    })
    return { queued: 'scrape', for: job.payload?.scan_id }
  }
}

async function claimJob() {
  const { data: jobs } = await db
    .from('pipeline_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .limit(5)

  if (!jobs?.length) return null

  // Try to claim the first available job
  for (const job of jobs) {
    const { data, error } = await db
      .from('pipeline_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending') // optimistic lock
      .select()
      .single()

    if (!error && data) return data
  }
  return null
}

async function processJob(job) {
  logger.info(`Processing job`, { id: job.id, type: job.job_type, attempt: job.attempts + 1 })

  const handler = HANDLERS[job.job_type]
  if (!handler) {
    await db.from('pipeline_jobs').update({
      status: 'failed', error: `Unknown job_type: ${job.job_type}`, completed_at: new Date().toISOString(),
    }).eq('id', job.id)
    return
  }

  try {
    const result = await handler(job)
    await db.from('pipeline_jobs').update({
      status: 'done', result, completed_at: new Date().toISOString(),
    }).eq('id', job.id)
    logger.info(`Job completed`, { id: job.id, type: job.job_type })
  } catch (err) {
    const attempts = (job.attempts || 0) + 1
    const failed   = attempts >= (job.max_attempts || 3)
    await db.from('pipeline_jobs').update({
      status:       failed ? 'failed' : 'pending',
      error:        err.message,
      attempts,
      scheduled_at: failed ? undefined : new Date(Date.now() + attempts * 60000).toISOString(),
      completed_at: failed ? new Date().toISOString() : undefined,
    }).eq('id', job.id)
    logger.error(`Job ${failed ? 'failed' : 'rescheduled'}`, { id: job.id, error: err.message, attempts })
  }
}

async function poll() {
  try {
    const job = await claimJob()
    if (job) await limit(() => processJob(job))
  } catch (err) {
    logger.error('Poll error', { error: err.message })
  }
}

async function main() {
  await loadHandlers()
  logger.info('Queue worker started. Polling every 30s...')

  // Initial poll
  await poll()

  // Poll every 30 seconds
  setInterval(poll, 30000)
}

main().catch(err => {
  logger.error('Fatal error', { error: err.message })
  process.exit(1)
})
