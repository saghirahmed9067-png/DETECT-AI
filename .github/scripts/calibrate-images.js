#!/usr/bin/env node
/**
 * DETECTAI — Image Calibration Script
 * Runs in GitHub Actions (Node.js, no CPU limits)
 *
 * Uses 70% of GitHub Actions runner storage (~49GB of 70GB available)
 * Downloads 500 DiffusionDB AI images + 500 Unsplash real photos
 * Computes all 10 pixel signals on each
 * Stores mean + stddev in Supabase calibration_stats table
 *
 * Runtime: ~15-20 minutes on GitHub's Ubuntu runner
 */

const https  = require('https')
const http   = require('http')
const { createClient } = require('@supabase/supabase-js')

const HF_TOKEN         = process.env.HF_TOKEN
const SUPABASE_URL     = process.env.SUPABASE_URL
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY
const SAMPLE_COUNT     = parseInt(process.env.SAMPLE_COUNT || '500')
const CONCURRENCY      = 20   // parallel downloads

if (!HF_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env vars: HF_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Pixel Signal Computation (pure Node.js, same as frontend) ──────────────

function findPixelStart(bytes) {
  let i = 2
  while (i < bytes.length - 4) {
    const marker = (bytes[i] << 8) | bytes[i + 1]
    const len    = (bytes[i + 2] << 8) | bytes[i + 3]
    if (marker === 0xFFDA) return i + 4
    if ((marker >= 0xFFE0 && marker <= 0xFFEF) ||
        marker === 0xFFFE || marker === 0xFFDB ||
        marker === 0xFFC0 || marker === 0xFFC4) {
      i += 2 + len; continue
    }
    i += 2
  }
  return Math.floor(bytes.length * 0.3)
}

function samplePixels(bytes, count = 3000) {
  const start = findPixelStart(bytes)
  const end   = bytes.length - 2
  const range = end - start
  if (range <= 0) return []
  const step = Math.max(1, Math.floor(range / count))
  const out = []
  for (let i = start; i < end && out.length < count; i += step) out.push(bytes[i])
  return out
}

function calcEntropy(samples) {
  if (!samples.length) return 7.0
  const freq = new Array(256).fill(0)
  for (const b of samples) freq[b]++
  let h = 0
  for (const f of freq) {
    if (f > 0) { const p = f / samples.length; h -= p * Math.log2(p) }
  }
  return h
}

function calcNoise(samples) {
  if (samples.length < 2) return 10
  let d = 0
  for (let i = 1; i < samples.length; i++) d += Math.abs(samples[i] - samples[i-1])
  return d / (samples.length - 1)
}

function calcLuminance(samples) {
  if (!samples.length) return 0.6
  return samples.filter(b => b >= 90 && b <= 210).length / samples.length
}

function calcBgVariance(bytes) {
  const start = findPixelStart(bytes)
  const end   = start + Math.floor((bytes.length - start) * 0.08)
  const bg = []
  const step = Math.max(1, Math.floor((end - start) / 400))
  for (let i = start; i < end; i += step) bg.push(bytes[i])
  if (!bg.length) return 25
  const mean = bg.reduce((a, b) => a + b, 0) / bg.length
  return Math.sqrt(bg.reduce((a, b) => a + (b - mean) ** 2, 0) / bg.length)
}

function calcColorBalance(bytes) {
  const start = findPixelStart(bytes)
  const end   = bytes.length - 2
  const step  = Math.max(3, Math.floor((end - start) / 900))
  let r = 0, g = 0, b = 0, n = 0
  for (let i = start; i < end - 2 && n < 900; i += step) {
    r += bytes[i]; g += bytes[i+1]; b += bytes[i+2]; n++
  }
  if (!n) return 0.07
  const total = r + g + b
  if (!total) return 0.07
  return Math.abs(r/total - 0.333) + Math.abs(g/total - 0.333) + Math.abs(b/total - 0.333)
}

function calcHFDetail(samples) {
  if (samples.length < 6) return 8
  let s = 0
  for (let i = 2; i < samples.length; i++)
    s += Math.abs(samples[i] - 2*samples[i-1] + samples[i-2])
  return s / (samples.length - 2)
}

function calcSkinSmoothing(samples) {
  const skin = samples.filter(b => b >= 145 && b <= 225)
  if (skin.length < 30) return 0.5
  const mean = skin.reduce((a, b) => a + b, 0) / skin.length
  const std  = Math.sqrt(skin.reduce((a, b) => a + (b - mean) ** 2, 0) / skin.length)
  return Math.max(0, Math.min(1, 1 - std / 20))
}

function computeSignals(bytes, fileSize) {
  const samples = samplePixels(bytes, 3000)
  return {
    entropy:      calcEntropy(samples),
    noise:        calcNoise(samples),
    luminance:    calcLuminance(samples),
    background:   calcBgVariance(bytes),
    colorBalance: calcColorBalance(bytes),
    compression:  fileSize,
    hfDetail:     calcHFDetail(samples),
    skinSmooth:   calcSkinSmoothing(samples),
  }
}

// ── HTTP fetch ────────────────────────────────────────────────────────────────

function fetchBuffer(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const opts = new URL(url)
    opts.headers = { 'User-Agent': 'DETECTAI-Cal/3.0', ...headers }
    const req = lib.get(opts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location, headers).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ── HF Dataset row fetcher ────────────────────────────────────────────────────

async function fetchHFImageSignals(dataset, config, split, offset, imageField = 'image', urlField = null) {
  const apiUrl = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=1`
  try {
    const jsonBuf = await fetchBuffer(apiUrl, { 'Authorization': `Bearer ${HF_TOKEN}` })
    const data    = JSON.parse(jsonBuf.toString())
    const row     = data.rows?.[0]?.row
    if (!row) return null

    let imgUrl = null

    // URL field (Unsplash)
    if (urlField && typeof row[urlField] === 'string' && row[urlField].startsWith('http')) {
      imgUrl = row[urlField]
    }

    const img = row[imageField]
    if (!imgUrl && img) {
      if (typeof img === 'string') {
        if (img.startsWith('http')) imgUrl = img
        else if (img.startsWith('data:')) {
          // Decode base64 directly — Node.js has no CPU limit!
          const b64   = img.slice(img.indexOf(',') + 1)
          const bytes = Buffer.from(b64, 'base64')
          return computeSignals(bytes, bytes.length)
        }
      } else if (img && typeof img === 'object') {
        if (img.src?.startsWith('data:')) {
          const b64   = img.src.slice(img.src.indexOf(',') + 1)
          const bytes = Buffer.from(b64, 'base64')
          return computeSignals(bytes, bytes.length)
        }
        if (img.src?.startsWith('http')) imgUrl = img.src
        if (img.url?.startsWith('http'))  imgUrl = img.url
        if (img.bytes?.length > 0) {
          const bytes = Buffer.from(img.bytes)
          return computeSignals(bytes, bytes.length)
        }
        if (img.path) {
          imgUrl = `https://huggingface.co/datasets/${dataset}/resolve/main/${img.path}`
        }
      }
    }

    if (imgUrl) {
      const bytes = await fetchBuffer(imgUrl, { 'Authorization': `Bearer ${HF_TOKEN}` })
      return computeSignals(bytes, bytes.length)
    }
    return null
  } catch (e) {
    return null
  }
}

// ── Statistics ────────────────────────────────────────────────────────────────

function calcStats(values) {
  if (!values.length) return { mean: 0, std: 1 }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const std  = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 0.001
  return { mean: +mean.toFixed(4), std: +std.toFixed(4) }
}

// ── Concurrent processor ──────────────────────────────────────────────────────

async function processConcurrent(tasks, concurrency, processor) {
  const results = []
  let idx = 0
  let done = 0

  const worker = async () => {
    while (idx < tasks.length) {
      const i    = idx++
      const task = tasks[i]
      try {
        const r = await processor(task)
        if (r) results.push(r)
      } catch {}
      done++
      if (done % 50 === 0) {
        console.log(`  Progress: ${done}/${tasks.length} (${results.length} successful)`)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔬 DETECTAI Image Calibration`)
  console.log(`   Samples: ${SAMPLE_COUNT} AI + ${SAMPLE_COUNT} real`)
  console.log(`   Concurrency: ${CONCURRENCY}`)
  console.log(`   Started: ${new Date().toISOString()}\n`)

  // ── AI images: DiffusionDB large_random_100k ─────────────────────────────
  console.log(`📥 Downloading ${SAMPLE_COUNT} DiffusionDB AI images...`)
  const aiOffsets = Array.from({ length: SAMPLE_COUNT }, () =>
    Math.floor(Math.random() * 95_000)
  )

  const aiSignals = await processConcurrent(
    aiOffsets,
    CONCURRENCY,
    offset => fetchHFImageSignals('poloclub/diffusiondb', 'large_random_100k', 'train', offset, 'image')
  )
  console.log(`✅ AI: ${aiSignals.length}/${SAMPLE_COUNT} images processed\n`)

  // ── Real images: Unsplash 25k ─────────────────────────────────────────────
  console.log(`📥 Downloading ${SAMPLE_COUNT} Unsplash real photos...`)
  const realOffsets = Array.from({ length: SAMPLE_COUNT }, () =>
    Math.floor(Math.random() * 24_000)
  )

  const realSignals = await processConcurrent(
    realOffsets,
    CONCURRENCY,
    offset => fetchHFImageSignals('jamescalam/unsplash-25k-photos', 'default', 'train', offset, 'image', 'photo_image_url')
  )
  console.log(`✅ Real: ${realSignals.length}/${SAMPLE_COUNT} images processed\n`)

  if (aiSignals.length < 20 || realSignals.length < 20) {
    console.error(`❌ Not enough samples (AI: ${aiSignals.length}, Real: ${realSignals.length}). Aborting.`)
    process.exit(1)
  }

  // ── Compute statistics ────────────────────────────────────────────────────
  console.log('📊 Computing calibration statistics...')
  const fields = ['entropy', 'noise', 'luminance', 'background', 'colorBalance', 'compression', 'hfDetail', 'skinSmooth']
  const stats = {}

  for (const f of fields) {
    stats[`${f}_ai`]   = calcStats(aiSignals.map(s => s[f]).filter(v => v != null))
    stats[`${f}_real`] = calcStats(realSignals.map(s => s[f]).filter(v => v != null))
    console.log(`  ${f}: AI=${stats[`${f}_ai`].mean}±${stats[`${f}_ai`].std}  Real=${stats[`${f}_real`].mean}±${stats[`${f}_real`].std}`)
  }

  // ── Save to Supabase ──────────────────────────────────────────────────────
  console.log('\n💾 Saving to Supabase...')
  const payload = {
    id:                    1,   // single row, upserted
    entropy_ai_mean:       stats.entropy_ai.mean,       entropy_ai_std:       stats.entropy_ai.std,
    entropy_real_mean:     stats.entropy_real.mean,     entropy_real_std:     stats.entropy_real.std,
    noise_ai_mean:         stats.noise_ai.mean,         noise_ai_std:         stats.noise_ai.std,
    noise_real_mean:       stats.noise_real.mean,       noise_real_std:       stats.noise_real.std,
    luminance_ai_mean:     stats.luminance_ai.mean,     luminance_ai_std:     stats.luminance_ai.std,
    luminance_real_mean:   stats.luminance_real.mean,   luminance_real_std:   stats.luminance_real.std,
    bg_ai_mean:            stats.background_ai.mean,    bg_ai_std:            stats.background_ai.std,
    bg_real_mean:          stats.background_real.mean,  bg_real_std:          stats.background_real.std,
    color_ai_mean:         stats.colorBalance_ai.mean,  color_ai_std:         stats.colorBalance_ai.std,
    color_real_mean:       stats.colorBalance_real.mean,color_real_std:       stats.colorBalance_real.std,
    compression_ai_mean:   stats.compression_ai.mean,   compression_ai_std:   stats.compression_ai.std,
    compression_real_mean: stats.compression_real.mean, compression_real_std: stats.compression_real.std,
    hf_detail_ai_mean:     stats.hfDetail_ai.mean,      hf_detail_ai_std:     stats.hfDetail_ai.std,
    hf_detail_real_mean:   stats.hfDetail_real.mean,    hf_detail_real_std:   stats.hfDetail_real.std,
    skin_ai_mean:          stats.skinSmooth_ai.mean,     skin_ai_std:          stats.skinSmooth_ai.std,
    skin_real_mean:        stats.skinSmooth_real.mean,   skin_real_std:        stats.skinSmooth_real.std,
    ai_sample_count:       aiSignals.length,
    real_sample_count:     realSignals.length,
    updated_at:            new Date().toISOString(),
  }

  const { error } = await supabase
    .from('image_calibration_stats')
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    console.error('❌ Supabase error:', error.message)
    process.exit(1)
  }

  console.log(`\n✅ Calibration complete!`)
  console.log(`   AI samples:   ${aiSignals.length}`)
  console.log(`   Real samples: ${realSignals.length}`)
  console.log(`   Saved to: image_calibration_stats (id=1)`)
  console.log(`   Time: ${new Date().toISOString()}`)
}

main().catch(e => { console.error(e); process.exit(1) })
