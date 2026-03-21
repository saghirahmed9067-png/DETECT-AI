#!/usr/bin/env node
/**
 * DETECTAI — Audio Calibration Script
 * Downloads AI audio from ASVspoof5, MLAAD, WaveFake + real speech
 * Computes 8 acoustic signals per file
 * Stores calibration stats in Supabase audio_calibration_stats table
 */

const https  = require('https')
const http   = require('http')
const { createClient } = require('@supabase/supabase-js')

const HF_TOKEN     = process.env.HF_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const SAMPLE_COUNT = parseInt(process.env.SAMPLE_COUNT || '300')
const CONCURRENCY  = 10

if (!HF_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function fetchBuffer(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const opts = new URL(url)
    opts.headers = { 'User-Agent': 'DETECTAI-AudioCal/1.0', ...headers }
    const req = lib.get(opts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location, headers).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ── Audio Signal Computation ──────────────────────────────────────────────────

function computeAudioSignals(bytes, fileSize, format) {
  const kb = fileSize / 1024
  const durationEst = Math.max(1, kb / 16)
  const bitrateKbps = (kb * 8) / durationEst

  // Signal 1: Bitrate
  const bitrate = bitrateKbps

  // Signal 2: Byte entropy of audio data
  const audioStart = format === 'wav' ? 44 : 0
  const slice = bytes.slice(audioStart, audioStart + Math.min(8000, bytes.length))
  const freq = new Array(256).fill(0)
  for (const b of slice) freq[b]++
  let entropy = 0
  for (const f of freq) {
    if (f > 0) { const p = f / slice.length; entropy -= p * Math.log2(p) }
  }

  // Signal 3: Silence ratio
  let silenceClusters = 0
  let inSilence = false
  let totalBlocks = 0
  for (let i = audioStart; i < bytes.length; i += 4) {
    const amp = Math.abs(bytes[i] - 128)
    totalBlocks++
    if (amp < 4) { if (!inSilence) { silenceClusters++; inSilence = true } }
    else inSilence = false
  }
  const silenceRatio = totalBlocks > 0 ? Math.min(1, silenceClusters / (totalBlocks * 0.01)) : 0

  // Signal 4: Zero crossing rate (real speech has more zero crossings than TTS)
  let zeroCrossings = 0
  for (let i = audioStart + 1; i < Math.min(bytes.length, audioStart + 4000); i++) {
    const prev = bytes[i-1] - 128
    const curr = bytes[i]   - 128
    if ((prev > 0) !== (curr > 0)) zeroCrossings++
  }
  const zcr = zeroCrossings / Math.min(4000, bytes.length - audioStart)

  // Signal 5: Amplitude variance
  const amplitudes = []
  for (let i = audioStart; i < bytes.length; i += 8) amplitudes.push(Math.abs(bytes[i] - 128))
  const ampMean = amplitudes.reduce((a,b)=>a+b,0) / (amplitudes.length||1)
  const ampVar  = amplitudes.reduce((a,b)=>a+(b-ampMean)**2,0) / (amplitudes.length||1)

  // Signal 6: File size
  const fileSizeKb = kb

  return { bitrate, entropy, silenceRatio, zcr, ampVariance: ampVar, fileSizeKb }
}

async function fetchAudioSignals(dataset, config, split, offset, audioField = 'audio', labelField = null) {
  try {
    const apiUrl = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=1`
    const jsonBuf = await fetchBuffer(apiUrl, { 'Authorization': `Bearer ${HF_TOKEN}` })
    const data    = JSON.parse(jsonBuf.toString())
    const row     = data.rows?.[0]?.row
    if (!row) return null

    // Get label
    let label = null
    if (labelField) {
      const lv = String(row[labelField] || '').toLowerCase()
      if (/fake|spoof|ai|1/.test(lv))    label = 'ai'
      if (/real|bonafide|human|0/.test(lv)) label = 'real'
    }

    const audio = row[audioField]
    if (!audio) return null

    let audioBytes = null
    let format = 'wav'

    if (audio.bytes?.length > 0) {
      audioBytes = Buffer.from(audio.bytes)
    } else if (typeof audio.path === 'string' && audio.path.length > 0) {
      format = audio.path.split('.').pop()?.toLowerCase() || 'wav'
      const url = audio.path.startsWith('http')
        ? audio.path
        : `https://huggingface.co/datasets/${dataset}/resolve/main/${audio.path}`
      audioBytes = await fetchBuffer(url, { 'Authorization': `Bearer ${HF_TOKEN}` })
    } else if (typeof audio === 'string' && audio.startsWith('http')) {
      audioBytes = await fetchBuffer(audio, { 'Authorization': `Bearer ${HF_TOKEN}` })
    }

    if (!audioBytes) return null

    const signals = computeAudioSignals(audioBytes, audioBytes.length, format)
    return { ...signals, label }
  } catch { return null }
}

function calcStats(values) {
  if (!values.length) return { mean: 0, std: 1 }
  const mean = values.reduce((a,b)=>a+b,0) / values.length
  const std  = Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length) || 0.001
  return { mean: +mean.toFixed(4), std: +std.toFixed(4) }
}

async function processConcurrent(tasks, concurrency, processor) {
  const results = []
  let idx = 0, done = 0
  const worker = async () => {
    while (idx < tasks.length) {
      const task = tasks[idx++]
      try { const r = await processor(task); if (r) results.push(r) } catch {}
      done++
      if (done % 30 === 0) console.log(`  Progress: ${done}/${tasks.length} (${results.length} ok)`)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

async function main() {
  console.log(`\n🎵 DETECTAI Audio Calibration`)
  console.log(`   Samples: ${SAMPLE_COUNT} AI + ${SAMPLE_COUNT} real`)
  console.log(`   Started: ${new Date().toISOString()}\n`)

  // ── AI audio from multiple datasets ──────────────────────────────────────
  console.log('📥 Downloading AI audio samples...')

  // Mix sources: ASVspoof5, MLAAD, WaveFake
  const aiTasks = [
    // ASVspoof5 — 40% of samples (spoofed TTS attacks)
    ...Array.from({ length: Math.floor(SAMPLE_COUNT * 0.4) }, () => ({
      dataset: 'jungjee/asvspoof5', config: 'default', split: 'train',
      offset: Math.floor(Math.random() * 50_000),
      audioField: 'audio', labelField: 'label', forcedLabel: 'ai',
    })),
    // MLAAD — 40% (multilingual TTS, 140 models)
    ...Array.from({ length: Math.floor(SAMPLE_COUNT * 0.4) }, () => ({
      dataset: 'mueller91/MLAAD', config: 'default', split: 'train',
      offset: Math.floor(Math.random() * 100_000),
      audioField: 'audio', labelField: null, forcedLabel: 'ai',
    })),
    // WaveFake — 20% (GAN-generated audio)
    ...Array.from({ length: Math.floor(SAMPLE_COUNT * 0.2) }, () => ({
      dataset: 'balt0/WaveFake', config: 'default', split: 'train',
      offset: Math.floor(Math.random() * 20_000),
      audioField: 'audio', labelField: null, forcedLabel: 'ai',
    })),
  ]

  const aiResults = await processConcurrent(aiTasks, CONCURRENCY, t =>
    fetchAudioSignals(t.dataset, t.config, t.split, t.offset, t.audioField, t.labelField)
      .then(r => r ? { ...r, label: t.forcedLabel } : null)
  )
  console.log(`✅ AI audio: ${aiResults.length} samples\n`)

  // ── Real audio ────────────────────────────────────────────────────────────
  console.log('📥 Downloading real audio samples...')
  const realTasks = [
    // LibriSpeech — 50%
    ...Array.from({ length: Math.floor(SAMPLE_COUNT * 0.5) }, () => ({
      dataset: 'openslr/librispeech_asr', config: 'clean', split: 'train.clean.100',
      offset: Math.floor(Math.random() * 28_000),
      audioField: 'audio', forcedLabel: 'real',
    })),
    // Mozilla Common Voice — 50%
    ...Array.from({ length: Math.floor(SAMPLE_COUNT * 0.5) }, () => ({
      dataset: 'mozilla-foundation/common_voice_11_0', config: 'en', split: 'train',
      offset: Math.floor(Math.random() * 200_000),
      audioField: 'audio', forcedLabel: 'real',
    })),
  ]

  const realResults = await processConcurrent(realTasks, CONCURRENCY, t =>
    fetchAudioSignals(t.dataset, t.config, t.split, t.offset, t.audioField, null)
      .then(r => r ? { ...r, label: t.forcedLabel } : null)
  )
  console.log(`✅ Real audio: ${realResults.length} samples\n`)

  if (aiResults.length < 20 || realResults.length < 20) {
    console.error(`❌ Not enough samples. AI: ${aiResults.length}, Real: ${realResults.length}`)
    process.exit(1)
  }

  // ── Compute statistics ────────────────────────────────────────────────────
  console.log('📊 Computing calibration statistics...')
  const fields = ['bitrate', 'entropy', 'silenceRatio', 'zcr', 'ampVariance', 'fileSizeKb']
  const stats  = {}

  for (const f of fields) {
    stats[`${f}_ai`]   = calcStats(aiResults.map(s => s[f]).filter(v => v != null && isFinite(v)))
    stats[`${f}_real`] = calcStats(realResults.map(s => s[f]).filter(v => v != null && isFinite(v)))
    console.log(`  ${f}: AI=${stats[`${f}_ai`].mean}±${stats[`${f}_ai`].std}  Real=${stats[`${f}_real`].mean}±${stats[`${f}_real`].std}`)
  }

  // ── Save to Supabase ──────────────────────────────────────────────────────
  console.log('\n💾 Saving to Supabase...')
  const { error } = await supabase.from('audio_calibration_stats').upsert({
    id:                   1,
    bitrate_ai_mean:      stats.bitrate_ai.mean,      bitrate_ai_std:      stats.bitrate_ai.std,
    bitrate_real_mean:    stats.bitrate_real.mean,    bitrate_real_std:    stats.bitrate_real.std,
    entropy_ai_mean:      stats.entropy_ai.mean,      entropy_ai_std:      stats.entropy_ai.std,
    entropy_real_mean:    stats.entropy_real.mean,    entropy_real_std:    stats.entropy_real.std,
    silence_ai_mean:      stats.silenceRatio_ai.mean, silence_ai_std:      stats.silenceRatio_ai.std,
    silence_real_mean:    stats.silenceRatio_real.mean,silence_real_std:   stats.silenceRatio_real.std,
    zcr_ai_mean:          stats.zcr_ai.mean,          zcr_ai_std:          stats.zcr_ai.std,
    zcr_real_mean:        stats.zcr_real.mean,        zcr_real_std:        stats.zcr_real.std,
    ampvar_ai_mean:       stats.ampVariance_ai.mean,  ampvar_ai_std:       stats.ampVariance_ai.std,
    ampvar_real_mean:     stats.ampVariance_real.mean,ampvar_real_std:     stats.ampVariance_real.std,
    filesize_ai_mean:     stats.fileSizeKb_ai.mean,   filesize_ai_std:     stats.fileSizeKb_ai.std,
    filesize_real_mean:   stats.fileSizeKb_real.mean, filesize_real_std:   stats.fileSizeKb_real.std,
    ai_sample_count:      aiResults.length,
    real_sample_count:    realResults.length,
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'id' })

  if (error) { console.error('❌ Supabase error:', error.message); process.exit(1) }
  console.log(`\n✅ Audio calibration complete! AI:${aiResults.length} Real:${realResults.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })

// ── AUDIO MODEL ACCURACY TRACKING ────────────────────────────────────────────
const FINETUNED_AUDIO_MODEL = 'saghi776/aiscern-audio-detector'

async function testAudioModelAccuracy() {
  if (!HF_TOKEN) return null

  // We don't re-download buffers here — pull a sample from Supabase instead
  console.log(`\n🎯 Testing ${FINETUNED_AUDIO_MODEL} — checking model endpoint availability...`)

  // Lightweight check: just ping the model with a tiny buffer to see if it's warm
  try {
    const testBuf = Buffer.alloc(4096, 0)  // silent audio — just tests model availability
    const res = await fetch(`https://api-inference.huggingface.co/models/${FINETUNED_AUDIO_MODEL}`, {
      method:  'POST',
      headers: {
        'Authorization':    `Bearer ${HF_TOKEN}`,
        'Content-Type':     'application/octet-stream',
        'X-Wait-For-Model': 'true',
      },
      body:   testBuf,
      signal: AbortSignal.timeout(30000),
    })
    const status = res.ok ? 'available' : `error ${res.status}`
    console.log(`   Model status: ${status}`)
  } catch (e) {
    console.log(`   Model unreachable: ${e.message}`)
  }
}

// ── AUDIO HARD NEGATIVE MINING ────────────────────────────────────────────────
async function extractAudioHardNegatives() {
  console.log('\n🔍 Mining hard negatives from recent uncertain audio scans...')

  const { data: uncertainScans, error } = await supabase
    .from('scans')
    .select('id, confidence_score, verdict, media_type, metadata, created_at')
    .eq('media_type', 'audio')
    .gte('confidence_score', 0.40)
    .lte('confidence_score', 0.60)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) { console.warn('[audio-hard-negatives] Query error:', error.message); return }
  if (!uncertainScans?.length) { console.log('   No uncertain audio scans found'); return }

  console.log(`   Found ${uncertainScans.length} uncertain audio scans (0.40–0.60 confidence)`)

  const { error: upsertError } = await supabase.from('training_candidates').upsert(
    uncertainScans.map(scan => ({
      scan_id:    scan.id,
      media_type: 'audio',
      confidence: scan.confidence_score,
      verdict:    scan.verdict,
      flagged_at: new Date().toISOString(),
      reason:     'uncertain_zone',
    })),
    { onConflict: 'scan_id' }
  )

  if (upsertError) console.warn('[audio-hard-negatives] Upsert error:', upsertError.message)
  else console.log(`   ✅ ${uncertainScans.length} audio candidates saved to training_candidates`)
}

Promise.resolve()
  .then(() => testAudioModelAccuracy())
  .then(() => extractAudioHardNegatives())
  .catch(e => console.warn('[post-calibration]', e.message))
