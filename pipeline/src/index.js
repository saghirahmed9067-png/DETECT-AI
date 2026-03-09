/**
 * DETECTAI Pipeline Runner v6 — MAX SCALE
 * 8 parallel scrapers · 30+ sources · real HF push
 */
import { createClient } from '@supabase/supabase-js'

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || ''
const HF_REPO  = 'saghi776/detectai-dataset'

if (!SB_URL || !SB_KEY) { console.error('Missing SUPABASE_URL / KEY'); process.exit(1) }

const db = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

async function setStatus(id, status, result = null) {
  await db.from('pipeline_jobs').update({
    status,
    ...(status === 'running'                     ? { started_at:   new Date().toISOString() } : {}),
    ...(['done','failed'].includes(status)        ? { completed_at: new Date().toISOString() } : {}),
    ...(result ? { result } : {}),
  }).eq('id', id)
}

async function runPipeline() {
  console.log('🚀 Pipeline v6 started at', new Date().toISOString())

  const { data: jobs, error } = await db
    .from('pipeline_jobs').select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) { console.error('Fetch jobs:', error.message); process.exit(1) }
  if (!jobs?.length) { console.log('No pending jobs'); process.exit(0) }

  console.log(`📋 ${jobs.length} pending jobs`)

  // Group by priority and run parallel
  const byP = {}
  for (const j of jobs) (byP[j.priority] = byP[j.priority] || []).push(j)

  for (const p of Object.keys(byP).sort((a,b) => +a - +b)) {
    const group = byP[p]
    console.log(`▶ Priority ${p}: ${group.length} jobs parallel`)
    await Promise.all(group.map(async job => {
      await setStatus(job.id, 'running')
      try {
        const { runScraper }  = await import('./workers/scraper.js')
        const { runCleaner }  = await import('./workers/cleaner.js')
        const { runUploader } = await import('./workers/uploader.js')
        let result
        if      (job.job_type === 'scrape')  result = await runScraper(job.payload || {}, db)
        else if (job.job_type === 'clean')   result = await runCleaner({}, db)
        else if (job.job_type === 'augment') result = { augmented: true }
        else if (job.job_type === 'upload')  result = await runUploader({}, db)
        else if (job.job_type === 'hf_push') result = await runUploader({ hf_push: true }, db)
        else result = { skipped: true }
        await setStatus(job.id, 'done', result)
        console.log(`  ✅ ${job.job_type}[${job.id.slice(0,6)}] done`)
      } catch (err) {
        await setStatus(job.id, 'failed', { error: err.message })
        console.error(`  ❌ ${job.job_type}:`, err.message)
      }
    }))
  }
  console.log('🏁 Pipeline complete at', new Date().toISOString())
}

runPipeline().catch(e => { console.error('Fatal:', e); process.exit(1) })
