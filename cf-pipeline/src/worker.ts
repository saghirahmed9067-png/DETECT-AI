/**
 * DETECTAI Neural Pipeline v5 — Universal Worker Template
 * Used by all 20 workers. WORKER_NUM env var (1–20) controls behaviour:
 *   Workers 1–19: scrape their assigned sources every minute
 *   Worker 20:    push to HuggingFace every 10 min + cleanup every 100 min
 *
 * Source assignment (57 sources ÷ 19 workers = ~3 per worker):
 *   Workers 1–19 each get a consecutive slice of ALL_SOURCES
 */

import {
  Env, ALL_SOURCES, getWorkerSources,
  scrapeSource, pushToHF, cleanupPushed, getStatus,
} from './core'

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url   = new URL(req.url)
    const wnum  = parseInt(env.WORKER_NUM ?? '1')
    const wid   = `worker-${wnum}`
    const cors  = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    const repo  = env.HF_REPO ?? 'saghi776/detectai-dataset'

    if (url.pathname === '/status') {
      return Response.json(await getStatus(env.DB), { headers: cors })
    }

    if (url.pathname === '/health') {
      const sources = wnum <= 19 ? getWorkerSources(wnum) : []
      return Response.json({
        ok:      true,
        worker:  wid,
        num:     wnum,
        role:    wnum === 20 ? 'hf-push + cleanup' : 'scraper',
        sources: sources.map(s => `${s.name} [${s.media_type}/${s.label}]`),
        ts:      new Date().toISOString(),
      }, { headers: cors })
    }

    if (url.pathname === '/trigger/scrape' && req.method === 'POST') {
      if (wnum === 20) return Response.json({ error: 'worker 20 is push-only' }, { status: 400, headers: cors })
      const sources = getWorkerSources(wnum)
      const src     = sources[Math.floor(Math.random() * sources.length)]
      const result  = await scrapeSource(env.DB, src, env.HF_TOKEN, wid, 60)
      return Response.json({ ok: true, worker: wid, result }, { headers: cors })
    }

    if (url.pathname === '/trigger/push' && req.method === 'POST') {
      const result = await pushToHF(env.DB, env.HF_TOKEN, repo, 3000)
      return Response.json({ ok: true, worker: wid, push: result }, { headers: cors })
    }

    if (url.pathname === '/trigger/cleanup' && req.method === 'POST') {
      const deleted = await cleanupPushed(env.DB)
      return Response.json({ ok: true, worker: wid, deleted }, { headers: cors })
    }

    // Default: worker info
    const sources = wnum <= 19 ? getWorkerSources(wnum) : []
    return Response.json({
      worker:  wid,
      num:     wnum,
      role:    wnum === 20 ? 'hf-push + cleanup' : 'scraper',
      sources: sources.map(s => `${s.name} [${s.media_type}]`),
      all_sources_total: ALL_SOURCES.length,
    }, { headers: cors })
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const wnum = parseInt(env.WORKER_NUM ?? '1')
    const wid  = `worker-${wnum}`
    const repo = env.HF_REPO ?? 'saghi776/detectai-dataset'
    const tick = Math.floor(Date.now() / 60000)

    if (wnum === 20) {
      // Worker 20: push every 10 ticks, cleanup every 100 ticks
      if (tick % 10 === 0) {
        const push = await pushToHF(env.DB, env.HF_TOKEN, repo, 3000)
        if (push.pushed > 0) console.log(`[W20] pushed ${push.pushed} → commit ${push.commitId}`)
        else if (push.error) console.error(`[W20] push ERROR: ${push.error}`)
        else console.log('[W20] nothing pending to push')
      }
      if (tick % 100 === 0) {
        const deleted = await cleanupPushed(env.DB)
        if (deleted > 0) console.log(`[W20] cleanup: removed ${deleted} pushed records`)
      }
      return
    }

    // Workers 1–19: scrape their assigned sources, rotating each tick
    const sources = getWorkerSources(wnum)
    if (!sources.length) return

    const src = sources[tick % sources.length]
    const res = await scrapeSource(env.DB, src, env.HF_TOKEN, wid, 60)
    console.log(`[W${wnum}] ${res.source} → inserted=${res.inserted} skipped=${res.skipped}${res.error ? ' ERR='+res.error : ''}`)
  },
}
