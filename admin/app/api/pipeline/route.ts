import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [jobs, items, scans, profiles] = await Promise.allSettled([
      db.from('pipeline_jobs').select('*').order('created_at', { ascending: false }).limit(50),
      db.from('dataset_items').select('id,media_type,label,split,is_deduplicated,hf_dataset_id,source_name,created_at').order('created_at', { ascending: false }).limit(200),
      db.from('scans').select('id,media_type,verdict,confidence_score,created_at,user_id').order('created_at', { ascending: false }).limit(100),
      db.from('profiles').select('id,email,display_name,plan,scan_count,created_at').order('created_at', { ascending: false }).limit(100),
    ])

    const jobsData    = jobs.status    === 'fulfilled' ? (jobs.value.data    ?? []) : []
    const itemsData   = items.status   === 'fulfilled' ? (items.value.data   ?? []) : []
    const scansData   = scans.status   === 'fulfilled' ? (scans.value.data   ?? []) : []
    const profilesData= profiles.status=== 'fulfilled' ? (profiles.value.data?? []) : []

    const jobStats = jobsData.reduce((a: any, j: any) => { a[j.status] = (a[j.status]||0)+1; return a }, {})
    const datasetStats = itemsData.reduce((a: any, i: any) => {
      const k = `${i.media_type}_${i.label}`; a[k] = (a[k]||0)+1; return a
    }, {})

    return NextResponse.json({ jobs: jobsData, jobStats, dataset: itemsData, datasetStats, scans: scansData, profiles: profilesData })
  } catch (err) {
    return NextResponse.json({ jobs:[], jobStats:{}, dataset:[], datasetStats:{}, scans:[], profiles:[], error: String(err) })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, job_type, payload } = await req.json()
    if (action === 'trigger') {
      const { error } = await db.from('pipeline_jobs').insert({
        job_type, status: 'pending',
        priority: job_type==='scrape' ? 1 : job_type==='clean' ? 2 : job_type==='augment' ? 3 : 4,
        payload: payload || {},
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
