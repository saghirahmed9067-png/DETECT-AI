/**
 * Aiscern — NVIDIA NIM Vision Client v2
 * Uses meta/llama-3.2-11b-vision-instruct for per-frame deepfake analysis.
 * Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
 *
 * v2 improvements:
 *  - Upgraded FRAME_PROMPT: 6-artifact specific analysis (face boundary, eye anomaly,
 *    skin smoothing, GAN pattern, detail loss, expression stiffness)
 *  - Artifact-weighted ai_score: 60% model confidence + 40% artifact count score
 *  - Concurrency limiter: max 5 parallel NIM calls to prevent rate-limit bursts
 */

const NIM_API   = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NIM_KEY   = process.env.NVIDIA_API_KEY ?? ''
const NIM_MODEL = 'meta/llama-3.2-11b-vision-instruct'

export interface NIMFrameResult {
  frame_index:    number
  time_sec:       number
  ai_score:       number          // 0–1
  face_detected:  boolean
  signals:        string[]
  reason:         string
  raw_confidence: number          // 0–100 as returned by model
  artifacts?:     Record<string, number>  // 6-artifact breakdown
}

export interface NIMVideoResult {
  frames:               NIMFrameResult[]
  temporal_consistency: number   // 0–1, lower = more inconsistent = more suspicious
  face_present_ratio:   number   // fraction of frames with a face
  mean_score:           number
  max_score:            number
  min_score:            number
  model:                string
}

/**
 * Upgraded prompt — specific 6-artifact analysis for maximum accuracy.
 * Specifying exact artifact types extracts more reliable signals than generic deepfake detection.
 */
const FRAME_PROMPT = `You are an expert deepfake and AI video detection system.
Analyze this video frame for these SPECIFIC deepfake artifacts:
1. FACE BOUNDARY ARTIFACTS: blurred/sharp boundary between face and neck/hair/background
2. EYE ANOMALIES: asymmetric reflections, unnatural pupil shapes, missing catchlights
3. TEMPORAL SMOOTHING: unnaturally smooth skin lacking micro-texture and pores
4. GAN CHECKERBOARD: periodic grid patterns in backgrounds or smooth surfaces
5. TOOTH/HAIR DETAIL: over-smooth teeth, unnaturally uniform hair strands
6. EXPRESSION STIFFNESS: limited micro-expression range or robotic blink patterns

Rate each artifact (0=absent, 1=present). Respond ONLY with valid JSON:
{"is_deepfake":boolean,"confidence":0-100,"face_detected":boolean,"artifacts":{"face_boundary":0,"eye_anomaly":0,"skin_smoothing":0,"gan_pattern":0,"detail_loss":0,"expression_stiffness":0},"signals":["signal1"],"reason":"1 sentence"}`

/**
 * Concurrency limiter — prevents rate-limit bursts when analyzing many frames.
 * Runs at most `limit` tasks concurrently; queues the rest.
 */
async function withConcurrencyLimit<T>(
  tasks:  (() => Promise<T>)[],
  limit:  number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  const queue   = tasks.map((task, i) => ({ task, i }))
  let   pos     = 0

  const runWorker = async () => {
    while (pos < queue.length) {
      const { task, i } = queue[pos++]
      try {
        results[i] = { status: 'fulfilled', value: await task() }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, runWorker)
  await Promise.all(workers)
  return results
}

async function analyzeFrame(
  base64Jpeg: string,
  frameIndex: number,
  timeSec:    number,
): Promise<NIMFrameResult> {
  const payload = {
    model:    NIM_MODEL,
    messages: [{
      role:    'user',
      content: [
        {
          type:      'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` },
        },
        { type: 'text', text: FRAME_PROMPT },
      ],
    }],
    max_tokens:  256,   // increased from 200 to accommodate artifacts object
    temperature: 0.05,  // near-deterministic
  }

  const res = await fetch(NIM_API, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${NIM_KEY}`,
      'Content-Type':  'application/json',
    },
    body:   JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`NVIDIA NIM ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[]
  }

  const content = data.choices?.[0]?.message?.content ?? '{}'
  const clean   = content.replace(/```json\n?|\n?```/g, '').trim()

  let parsed: {
    is_deepfake:    boolean
    confidence:     number
    face_detected:  boolean
    artifacts?:     Record<string, number>
    signals:        string[]
    reason:         string
  }

  try {
    parsed = JSON.parse(clean)
  } catch {
    const confMatch = clean.match(/"confidence"\s*:\s*(\d+)/)
    const fakeMatch = clean.match(/"is_deepfake"\s*:\s*(true|false)/)
    parsed = {
      is_deepfake:  fakeMatch?.[1] === 'true' ?? false,
      confidence:   confMatch ? parseInt(confMatch[1]) : 50,
      face_detected: /face/i.test(clean),
      signals:      [],
      reason:       clean.slice(0, 100),
    }
  }

  const rawConf = Math.max(0, Math.min(100, parsed.confidence ?? 50))

  // Artifact-weighted score: 60% model confidence + 40% artifact count
  const artifactScore = parsed.artifacts
    ? Object.values(parsed.artifacts).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0) / 6
    : 0

  const modelScore = parsed.is_deepfake ? rawConf / 100 : 1 - rawConf / 100
  const aiScore    = modelScore * 0.60 + artifactScore * 0.40

  // Merge model signals + named artifacts into signals[]
  const artifactSignals = parsed.artifacts
    ? Object.entries(parsed.artifacts)
        .filter(([, v]) => v === 1)
        .map(([k]) => k.replace(/_/g, ' '))
    : []

  return {
    frame_index:    frameIndex,
    time_sec:       timeSec,
    ai_score:       Math.round(Math.max(0, Math.min(1, aiScore)) * 1000) / 1000,
    face_detected:  parsed.face_detected ?? false,
    signals:        [...(parsed.signals ?? []), ...artifactSignals],
    reason:         parsed.reason ?? '',
    raw_confidence: rawConf,
    artifacts:      parsed.artifacts,
  }
}

/**
 * Analyze multiple video frames with concurrency limiting (max 5 parallel NIM calls).
 * Uses artifact-weighted scoring for higher accuracy.
 */
export async function analyzeVideoFrames(
  frames: { base64: string; index: number; timeSec: number }[],
): Promise<NIMVideoResult> {
  if (!NIM_KEY) throw new Error('NVIDIA_API_KEY not configured')
  if (!frames.length) throw new Error('No frames provided')

  // Concurrency cap: max 5 parallel NIM calls to prevent rate-limit bursts
  const results = await withConcurrencyLimit(
    frames.map(f => () => analyzeFrame(f.base64, f.index, f.timeSec)),
    5,
  )

  const successful: NIMFrameResult[] = results
    .filter((r): r is PromiseFulfilledResult<NIMFrameResult> => r.status === 'fulfilled')
    .map(r => r.value)

  if (!successful.length) {
    const firstErr = results.find(r => r.status === 'rejected') as PromiseRejectedResult
    throw new Error(firstErr?.reason?.message ?? 'All frame analyses failed')
  }

  const scores = successful.map(f => f.ai_score)
  const mean   = scores.reduce((a, b) => a + b, 0) / scores.length

  // Temporal consistency: low variance = consistent = less suspicious
  const variance           = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
  const stdDev             = Math.sqrt(variance)
  const temporalConsistency = Math.max(0, Math.min(1, 1 - (stdDev / 0.3)))
  const facePresentRatio   = successful.filter(f => f.face_detected).length / successful.length

  return {
    frames:               successful,
    temporal_consistency: Math.round(temporalConsistency * 1000) / 1000,
    face_present_ratio:   Math.round(facePresentRatio * 1000) / 1000,
    mean_score:           Math.round(mean * 1000) / 1000,
    max_score:            Math.max(...scores),
    min_score:            Math.min(...scores),
    model:                NIM_MODEL,
  }
}
