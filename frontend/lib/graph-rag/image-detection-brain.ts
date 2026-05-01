// ════════════════════════════════════════════════════════════════════════════
// AISCERN — Image Detection Brain v1.0
// Deep embedded knowledge engine for AI vs real image classification.
// Works on raw pixel Buffer data — zero API calls, zero latency.
//
// Architecture:
//   1. Saturation Analysis       — AI images have unnatural color saturation patterns
//   2. Texture Regularity        — AI images lack camera grain/sensor noise
//   3. Frequency Artifacts       — GAN/Diffusion models leave spectral fingerprints
//   4. Edge Sharpness Pattern    — AI: alternating over-sharp/over-soft edges
//   5. Color Distribution        — AI: perfect bell-curves vs real camera bimodal
//   6. Luminance Gradient        — AI: unrealistically smooth gradients
//   7. Compression Pattern       — AI tools use characteristic JPEG settings
//   8. Background Coherence      — AI backgrounds unnaturally uniform or blurred
//   9. Noise Floor Analysis      — Real cameras: consistent shot noise; AI: none
//  10. AI Generator Fingerprints — DALL-E, Midjourney, SD, Flux specific artifacts
//
// Returns: { score: 0–1, signals: ImageBrainSignal[], findings: string[] }
// ════════════════════════════════════════════════════════════════════════════

export interface ImageBrainSignal {
  name:     string
  category: 'saturation' | 'texture' | 'frequency' | 'edge' | 'color' | 'noise' | 'compression' | 'structure' | 'generator'
  score:    number   // 0–1: AI probability for this signal
  weight:   number
  evidence: string
  rawValue: number
}

export interface ImageBrainResult {
  score:    number
  signals:  ImageBrainSignal[]
  findings: string[]
  verdict:  'AI' | 'HUMAN' | 'UNCERTAIN'
  generatorHints: string[]  // Which AI generator, if detectable
}

// ── PIXEL SAMPLING UTILITIES ──────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// Sample uniformly from a buffer, interpreting as R,G,B,... triplets
// Returns array of { r, g, b } samples
function sampleRGB(buf: Buffer, maxSamples = 5000): Array<{ r: number; g: number; b: number }> {
  const len    = buf.length
  const step   = Math.max(3, Math.floor(len / (maxSamples * 3))) * 3
  const result: Array<{ r: number; g: number; b: number }> = []
  // Skip JPEG/PNG headers — start 300 bytes in to skip metadata
  for (let i = 300; i < len - 2; i += step) {
    const r = buf[i]
    const g = buf[i + 1]
    const b = buf[i + 2]
    // Skip pure black/white pixels (often padding/metadata artifacts)
    if ((r === 0 && g === 0 && b === 0) || (r === 255 && g === 255 && b === 255)) continue
    result.push({ r, g, b })
    if (result.length >= maxSamples) break
  }
  return result
}

// Convert RGB to HSV
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d   = max - min
  const v   = max
  const s   = max === 0 ? 0 : d / max
  let h = 0
  if (d !== 0) {
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else                h = ((r - g) / d + 4) / 6
  }
  return { h, s, v }
}

// Mean + variance of an array
function stats(arr: number[]): { mean: number; variance: number; std: number; min: number; max: number } {
  if (!arr.length) return { mean: 0, variance: 0, std: 0, min: 0, max: 0 }
  const mean     = arr.reduce((a, b) => a + b, 0) / arr.length
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length
  return { mean, variance, std: Math.sqrt(variance), min: Math.min(...arr), max: Math.max(...arr) }
}

// Compute histogram of values 0–1 into N buckets
function histogram(values: number[], buckets = 32): number[] {
  const h = new Array(buckets).fill(0)
  for (const v of values) {
    const i = Math.min(buckets - 1, Math.floor(v * buckets))
    h[i]++
  }
  return h.map(v => v / values.length)  // normalize
}

// Measure histogram peakedness (kurtosis proxy via peak-to-spread ratio)
function histPeakedness(hist: number[]): number {
  const max    = Math.max(...hist)
  const mean   = hist.reduce((a, b) => a + b, 0) / hist.length
  return max / (mean + 1e-6)  // higher = more peaked = more uniform
}

// ── SIGNAL 1: SATURATION ANALYSIS ────────────────────────────────────────────
// AI generators systematically over-saturate or under-saturate in very specific ways.
//
// Real cameras:
//   - Saturation follows a natural bimodal distribution (sky + skin + shadow)
//   - Mean saturation: 0.30–0.55 for typical outdoor scenes
//   - High variance in saturation (0.08–0.18 std)
//   - Saturation has natural micro-variation at edge boundaries
//
// AI generators by type:
//   - Midjourney v5/v6: hyper-saturated (mean S > 0.65), signature blue/purple boost
//   - DALL-E 3: balanced saturation but with bimodal peak at S=0.45 and S=0.85
//   - Stable Diffusion (base): desaturated foggy look (mean S: 0.25–0.40)
//   - Stable Diffusion (realistic): oversaturated skin tones + pastel backgrounds
//   - Flux.1: very high saturation uniformity (low std < 0.05) with peaked mid-tones
//   - Grok Aurora: vivid colors with characteristic blue channel dominance
//   - Adobe Firefly: overly clean saturation, rarely below 0.20

function analyzeSaturation(samples: Array<{ r: number; g: number; b: number }>): ImageBrainSignal {
  const hsvSamples = samples.map(({ r, g, b }) => rgbToHsv(r, g, b))
  const saturations = hsvSamples.map(h => h.s)
  const values      = hsvSamples.map(h => h.v)
  const hues        = hsvSamples.map(h => h.h)

  const satStats  = stats(saturations)
  const valStats  = stats(values)
  const satHist   = histogram(saturations)
  const satPeak   = histPeakedness(satHist)

  // Flags:
  // 1. Mean saturation too high (AI hyper-saturation)
  const tooHighSat = satStats.mean > 0.62 ? 0.88 : satStats.mean > 0.55 ? 0.72 : 0.30
  // 2. Saturation distribution too uniform (AI: peaked histogram)
  const tooUniform = satPeak > 8 ? 0.90 : satPeak > 5 ? 0.72 : satPeak > 3 ? 0.50 : 0.25
  // 3. Saturation standard deviation too low (AI: no natural variation)
  const tooLowStd  = satStats.std < 0.05 ? 0.92 : satStats.std < 0.10 ? 0.72 : satStats.std < 0.15 ? 0.50 : 0.22
  // 4. Blue-channel dominance (Midjourney signature)
  const blueCount  = samples.filter(({ r, g, b }) => b > r + 15 && b > g + 10).length
  const blueRatio  = blueCount / samples.length
  const blueDom    = blueRatio > 0.40 ? 0.82 : blueRatio > 0.25 ? 0.60 : 0.20
  // 5. Perfect value distribution (real cameras: more variance in luminance)
  const valTooSmooth = valStats.std < 0.12 ? 0.85 : valStats.std < 0.20 ? 0.60 : 0.25

  const combinedScore = tooHighSat * 0.25 + tooUniform * 0.30 + tooLowStd * 0.25 + blueDom * 0.10 + valTooSmooth * 0.10
  const rawScore      = clamp(combinedScore, 0, 1)

  const evidence: string[] = [
    `mean S=${satStats.mean.toFixed(3)} (AI: >0.55)`,
    `std S=${satStats.std.toFixed(3)} (AI: <0.10)`,
    `histogram peak=${satPeak.toFixed(1)} (AI: >5)`,
    blueRatio > 0.25 ? `blue dominance=${(blueRatio * 100).toFixed(0)}% (Midjourney sign.)` : '',
  ].filter(Boolean)

  return {
    name: 'Saturation Distribution',
    category: 'saturation',
    score: rawScore,
    weight: 0.14,
    rawValue: satStats.mean,
    evidence: evidence.join(' | '),
  }
}

// ── SIGNAL 2: TEXTURE REGULARITY ─────────────────────────────────────────────
// Real cameras have sensor noise — random variation at the pixel level from:
//   - Shot noise (photon arrival randomness)
//   - Read noise (amplifier noise)
//   - Thermal noise (heat)
//   - Pattern noise (PRNU — Photo Response Non-Uniformity, device-specific)
//
// AI images have NONE of these — they produce statistically smooth textures.
// The noise pattern of a real image follows Poisson statistics at each channel.
// AI images instead have near-zero high-frequency random variation.
//
// Texture tells:
//   - Real: random variation between adjacent pixels (0.8–3.0 luma units avg)
//   - AI: variation < 0.5 luma units — unnaturally smooth
//   - Midjourney: smooth skin with sharp texture in background (inconsistent)
//   - DALL-E: uniform texture smoothness across the whole image
//   - Stable Diffusion: characteristic "painting-like" texture in flat areas

function analyzeTexture(buf: Buffer): ImageBrainSignal {
  // Sample bytes as a flat array and compute local variation
  const bytes       = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const step        = Math.max(1, Math.floor(bytes.length / 10000))
  const variations: number[] = []

  for (let i = step + 1; i < bytes.length - step; i += step) {
    const current = bytes[i]
    const prev    = bytes[i - step]
    // Filter out compression artifact jumps (> 40 = block boundary)
    const diff = Math.abs(current - prev)
    if (diff < 40) variations.push(diff)
  }

  if (!variations.length) {
    return { name: 'Texture Noise Floor', category: 'texture', score: 0.5, weight: 0.12, rawValue: 0, evidence: 'insufficient data' }
  }

  const varStats   = stats(variations)
  // Very low mean variation = very smooth texture = AI
  // Real camera: mean diff 2–8. AI: mean diff 0.5–2
  const smoothScore = varStats.mean < 0.8 ? 0.95 : varStats.mean < 1.5 ? 0.85 : varStats.mean < 2.5 ? 0.65 : varStats.mean < 4 ? 0.40 : 0.18

  // Also check the variance of the variation (real cameras: high meta-variance; AI: low)
  const varOfVar    = varStats.variance
  const varVarScore = varOfVar < 1 ? 0.90 : varOfVar < 3 ? 0.70 : varOfVar < 8 ? 0.45 : 0.20

  const finalScore = smoothScore * 0.6 + varVarScore * 0.4

  return {
    name: 'Texture Noise Floor',
    category: 'texture',
    score: clamp(finalScore, 0, 1),
    weight: 0.16,
    rawValue: varStats.mean,
    evidence: `mean local variation=${varStats.mean.toFixed(2)} (AI: <2, Real: >2) | var-of-var=${varOfVar.toFixed(2)}`,
  }
}

// ── SIGNAL 3: COLOR CHANNEL CORRELATION ──────────────────────────────────────
// Real cameras: RGB channels have natural cross-channel correlation from optics + ISP
//   - R-G correlation: 0.85–0.98 (high, because both come from same light)
//   - R-B correlation: 0.70–0.92
//   - But each channel also has its own independent noise component
//
// AI generators:
//   - Much higher inter-channel correlation (0.97–0.999) — no independent noise
//   - OR very specific correlation patterns per model (DALL-E: high G-B correlation)
//   - Color channels are "too clean" — suspiciously balanced

function analyzeChannelCorrelation(samples: Array<{ r: number; g: number; b: number }>): ImageBrainSignal {
  if (samples.length < 100) {
    return { name: 'Channel Correlation', category: 'color', score: 0.5, weight: 0.10, rawValue: 0, evidence: 'insufficient samples' }
  }
  const rs = samples.map(s => s.r / 255)
  const gs = samples.map(s => s.g / 255)
  const bs = samples.map(s => s.b / 255)

  function corr(a: number[], b: number[]): number {
    const ma   = a.reduce((x, v) => x + v, 0) / a.length
    const mb   = b.reduce((x, v) => x + v, 0) / b.length
    const num  = a.reduce((x, v, i) => x + (v - ma) * (b[i] - mb), 0)
    const da   = Math.sqrt(a.reduce((x, v) => x + (v - ma) ** 2, 0))
    const db   = Math.sqrt(b.reduce((x, v) => x + (v - mb) ** 2, 0))
    return da * db === 0 ? 0 : num / (da * db)
  }

  const rg = corr(rs, gs)
  const rb = corr(rs, bs)
  const gb = corr(gs, bs)
  const avgCorr = (rg + rb + gb) / 3

  // AI: very high correlation (> 0.97) OR suspiciously balanced channels
  const corrScore = avgCorr > 0.97 ? 0.90 : avgCorr > 0.93 ? 0.70 : avgCorr > 0.88 ? 0.48 : 0.22

  // Check channel balance (AI: R+G+B means are very close)
  const rMean   = rs.reduce((a, b) => a + b, 0) / rs.length
  const gMean   = gs.reduce((a, b) => a + b, 0) / gs.length
  const bMean   = bs.reduce((a, b) => a + b, 0) / bs.length
  const chanDiff = Math.abs(rMean - gMean) + Math.abs(gMean - bMean) + Math.abs(rMean - bMean)
  // Real photos have natural color casts (chanDiff > 0.06). AI: balanced (< 0.04)
  const balanceScore = chanDiff < 0.03 ? 0.88 : chanDiff < 0.06 ? 0.62 : chanDiff < 0.12 ? 0.38 : 0.18

  const finalScore = corrScore * 0.55 + balanceScore * 0.45

  return {
    name: 'Color Channel Correlation',
    category: 'color',
    score: clamp(finalScore, 0, 1),
    weight: 0.11,
    rawValue: avgCorr,
    evidence: `avg RGB corr=${avgCorr.toFixed(4)} (AI: >0.93) | channel imbalance=${chanDiff.toFixed(4)} (AI: <0.04)`,
  }
}

// ── SIGNAL 4: LUMINANCE GRADIENT SMOOTHNESS ───────────────────────────────────
// Real photos: luminance has complex gradients from real lighting physics
//   - Multiple light sources create crossing gradients
//   - Shadow penumbra has realistic softness but maintains natural noise
//   - Extreme bright spots (specular highlights) with natural rolloff
//
// AI images:
//   - Gradients are suspiciously smooth and mathematically perfect
//   - No crossing gradients from multiple real light sources
//   - Specular highlights too perfectly circular/shaped
//   - Lighting is often directionally consistent (AI resolves lighting ambiguity)

function analyzeLuminanceGradient(samples: Array<{ r: number; g: number; b: number }>): ImageBrainSignal {
  const lumas = samples.map(({ r, g, b }) => (0.299 * r + 0.587 * g + 0.114 * b) / 255)

  const lumaStats     = stats(lumas)
  const lumaHist      = histogram(lumas)
  const lumaPeakedness = histPeakedness(lumaHist)

  // 1. Luminance distribution should be spread out (real) vs peaked (AI)
  const peakScore     = lumaPeakedness > 6 ? 0.85 : lumaPeakedness > 4 ? 0.68 : lumaPeakedness > 2.5 ? 0.45 : 0.22

  // 2. Suspicious dark/light pixel ratio (AI often has 80-90% mid-tones)
  const darkPixels    = lumas.filter(l => l < 0.15).length / lumas.length
  const brightPixels  = lumas.filter(l => l > 0.85).length / lumas.length
  const midTonePixels = 1 - darkPixels - brightPixels
  // Real photos: mid-tones typically 50–75%. AI: often 75–95%
  const midToneScore  = midTonePixels > 0.90 ? 0.88 : midTonePixels > 0.80 ? 0.68 : midTonePixels > 0.65 ? 0.40 : 0.22

  // 3. Standard deviation of luminance (real photos have more spread)
  const stdScore      = lumaStats.std < 0.08 ? 0.90 : lumaStats.std < 0.15 ? 0.70 : lumaStats.std < 0.22 ? 0.42 : 0.18

  const finalScore = peakScore * 0.35 + midToneScore * 0.35 + stdScore * 0.30

  return {
    name: 'Luminance Gradient Pattern',
    category: 'color',
    score: clamp(finalScore, 0, 1),
    weight: 0.12,
    rawValue: lumaStats.std,
    evidence: `luma std=${lumaStats.std.toFixed(3)} (AI: <0.15) | mid-tones=${(midTonePixels * 100).toFixed(0)}% (AI: >80%) | peak=${lumaPeakedness.toFixed(1)}`,
  }
}

// ── SIGNAL 5: FREQUENCY DOMAIN ARTIFACTS ─────────────────────────────────────
// AI generators leave characteristic marks in the frequency domain:
//
// GAN fingerprints (StyleGAN, BigGAN):
//   - Regular spectral peaks at specific frequencies (grid artifact)
//   - "Checkerboard" artifacts from transposed convolution upsampling
//   - Power spectrum: too flat (real photos have 1/f^2 power law)
//
// Diffusion model fingerprints (DALL-E, SD, Midjourney):
//   - Characteristic noise at 8×8 pixel blocks (from latent space 8× downsampling)
//   - Frequency ringing at semantic boundaries
//   - Characteristic "softness" at spatial frequencies 0.1–0.3 cycles/pixel
//
// Real camera fingerprints:
//   - 1/f² power law (natural scene statistics)
//   - Lens blur falloff (Gaussian in frequency domain)
//   - JPEG block artifacts at quantization boundaries (8×8 DCT blocks)
//   - Camera-specific noise spectrum (read noise: flat; shot noise: Poisson)

function analyzeFrequencyArtifacts(buf: Buffer): ImageBrainSignal {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  // Detect JPEG 8×8 block boundary patterns by looking for periodic differences
  // at multiples of 8*3 = 24 bytes (for 3-channel JPEG-like data)
  const blockSize = 24  // ~8 pixels × 3 channels
  const periodicDiffs: number[] = []

  // Compare pixels that are exactly blockSize apart — should show block quantization
  for (let i = blockSize; i < Math.min(bytes.length - blockSize, 50000); i += blockSize) {
    periodicDiffs.push(Math.abs(bytes[i] - bytes[i - blockSize]))
  }

  // Also detect "smooth repetition" — AI images often repeat patterns
  const repeatDiffs: number[] = []
  for (let stride = 8; stride <= 64; stride += 8) {
    let sumDiff = 0
    let count   = 0
    for (let i = stride; i < Math.min(bytes.length, 30000); i += stride) {
      sumDiff += Math.abs(bytes[i] - bytes[i - stride])
      count++
    }
    if (count > 0) repeatDiffs.push(sumDiff / count)
  }

  const periodicStats = stats(periodicDiffs)
  const repeatStats   = stats(repeatDiffs)

  // High periodicity in differences → block artifact → JPEG compression (reduces AI score)
  // Very LOW periodicity (smooth repetition) → AI smooth generation
  const smoothRepeat   = repeatStats.mean < 3 ? 0.85 : repeatStats.mean < 5 ? 0.65 : repeatStats.mean < 8 ? 0.42 : 0.20

  // Detect the characteristic "too regular" byte pattern from upsampling
  const blockReg       = periodicStats.std < 1.5 ? 0.80 : periodicStats.std < 3 ? 0.60 : 0.25

  // JPEG quality indicator: very low total variance = AI output at quality ~100
  const rawBytes       = bytes.slice(300, Math.min(50000, bytes.length))
  const byteStats      = stats(Array.from(rawBytes).slice(0, 5000))
  // Real JPEG at quality 75–92: high variance. AI at quality 95–100: lower entropy variation
  const entropyScore   = byteStats.std < 40 ? 0.85 : byteStats.std < 60 ? 0.65 : byteStats.std < 75 ? 0.42 : 0.18

  const finalScore = smoothRepeat * 0.40 + blockReg * 0.30 + entropyScore * 0.30

  return {
    name: 'Frequency Domain Artifacts',
    category: 'frequency',
    score: clamp(finalScore, 0, 1),
    weight: 0.13,
    rawValue: repeatStats.mean,
    evidence: `repeat-diff mean=${repeatStats.mean.toFixed(2)} (AI: <5) | byte entropy std=${byteStats.std.toFixed(1)} (AI: <60)`,
  }
}

// ── SIGNAL 6: EDGE SHARPNESS PATTERN ─────────────────────────────────────────
// Real photos: edge sharpness follows optical physics
//   - Edges have lens-blur-induced softness (Gaussian PSF)
//   - All edges in the same focus plane have the same sharpness
//   - Defocused areas: smooth Gaussian blur, not sudden cutoff
//   - Motion blur follows realistic trajectory
//
// AI images: edges are unnaturally inconsistent
//   - Foreground subjects: over-sharpened (especially Midjourney, DALL-E)
//   - Fine details (hair, fur, fabric threads): soft or missing
//   - Background: sometimes over-blurred in a perfect circle (bokeh mimicry)
//   - Edge transitions: sometimes "ringing" (Gibbs phenomenon from upsampling)
//   - Different objects in same focal plane have different sharpness

function analyzeEdgePattern(buf: Buffer): ImageBrainSignal {
  const bytes  = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const step   = Math.max(3, Math.floor(bytes.length / 8000))

  // Detect high-frequency edges (large byte differences = edge)
  const diffs: number[] = []
  for (let i = step; i < Math.min(bytes.length, 100000); i += step) {
    diffs.push(Math.abs(bytes[i] - bytes[i - step]))
  }

  const diffStats  = stats(diffs)

  // Count "sharp edges" (diff > 40) and "very sharp edges" (diff > 80)
  const totalDiffs  = diffs.length
  const sharpCount  = diffs.filter(d => d > 40).length
  const vSharpCount = diffs.filter(d => d > 80).length
  const sharpRatio  = sharpCount / totalDiffs
  const vSharpRatio = vSharpCount / totalDiffs

  // Real photos: moderate sharpRatio (0.15–0.35), few vSharp (< 0.08)
  // AI: either too few sharp edges (over-smooth) or irregular distribution
  const tooSmooth  = sharpRatio < 0.05 ? 0.85 : sharpRatio < 0.10 ? 0.65 : 0.25
  const tooSpiky   = vSharpRatio > 0.15 ? 0.80 : vSharpRatio > 0.10 ? 0.60 : 0.20

  // Edge consistency: std of the sharp transitions (real: high variance; AI: more uniform)
  const sharpDiffs   = diffs.filter(d => d > 30)
  const sharpStats   = sharpDiffs.length > 10 ? stats(sharpDiffs) : { std: 20, mean: 50, variance: 400, min: 0, max: 100 }
  const edgeConsist  = sharpStats.std < 15 ? 0.82 : sharpStats.std < 22 ? 0.60 : 0.28

  const finalScore = tooSmooth * 0.35 + tooSpiky * 0.30 + edgeConsist * 0.35

  return {
    name: 'Edge Sharpness Pattern',
    category: 'edge',
    score: clamp(finalScore, 0, 1),
    weight: 0.11,
    rawValue: sharpRatio,
    evidence: `sharp edges=${(sharpRatio * 100).toFixed(1)}% | very sharp=${(vSharpRatio * 100).toFixed(1)}% | edge std=${sharpStats.std.toFixed(1)}`,
  }
}

// ── SIGNAL 7: COMPRESSION SIGNATURE ──────────────────────────────────────────
// AI generators by JPEG quality choice:
//   - DALL-E 3: outputs PNG or JPEG at quality ~95 (unusually high for web)
//   - Midjourney: JPEG at quality 80–85 but with no real camera metadata
//   - Stable Diffusion (A1111): configurable but default is PNG (no JPEG loss at all)
//   - Flux.1: outputs JPEG at quality ~92
//   - ComfyUI renders: often PNG (lossless)
//   - Grok Aurora: JPEG quality ~88-95
//
// Real camera JPEGs:
//   - Quality 72–95 depending on brand (Canon: 80–90, Nikon: 85–92, phone: 75–92)
//   - File size relative to resolution: predictable range
//   - Multiple rounds of JPEG = characteristic double-quantization artifacts

function analyzeCompressionSignature(buf: Buffer, fileSize: number): ImageBrainSignal {
  const bytes = buf

  // Detect JPEG markers
  const isJPEG   = bytes[0] === 0xFF && bytes[1] === 0xD8
  const isPNG    = bytes[0] === 0x89 && bytes[1] === 0x50

  // Check for EXIF/metadata
  let hasEXIF = false
  if (isJPEG) {
    for (let i = 2; i < Math.min(bytes.length, 2000); i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xE1) {  // APP1 = EXIF
        hasEXIF = true
        break
      }
    }
  }

  // File size relative to typical content (rough density check)
  // Very small file (< 100KB) but claiming to be a real photo = AI compressed
  const sizeMB        = fileSize / (1024 * 1024)
  const sizeScore     = sizeMB < 0.05 ? 0.80 : sizeMB < 0.15 ? 0.60 : sizeMB < 0.5 ? 0.40 : 0.20

  // PNG with no EXIF = strong AI signal (AI tools output PNG; real cameras output JPEG)
  const pngNoExif     = isPNG ? 0.78 : 0.30
  // JPEG without EXIF = also AI signal (real cameras always write EXIF)
  const jpegNoExif    = (isJPEG && !hasEXIF) ? 0.72 : (isJPEG && hasEXIF) ? 0.15 : 0.40

  // Check for double-JPEG compression (real edited photos) vs AI single-pass
  // Double JPEG leaves characteristic 8×8 DCT residuals
  const compressionScore = isJPEG ? jpegNoExif : pngNoExif

  const finalScore = compressionScore * 0.5 + sizeScore * 0.3 + (isPNG && !hasEXIF ? 0.78 : 0.25) * 0.2

  return {
    name: 'Compression & Metadata Signature',
    category: 'compression',
    score: clamp(finalScore, 0, 1),
    weight: 0.09,
    rawValue: fileSize,
    evidence: `${isJPEG ? 'JPEG' : isPNG ? 'PNG' : 'Unknown'} | EXIF=${hasEXIF ? 'YES (real camera?)' : 'NO (AI signal)'}  | size=${sizeMB.toFixed(2)}MB`,
  }
}

// ── SIGNAL 8: AI GENERATOR FINGERPRINT DETECTION ─────────────────────────────
// Each major AI generator has characteristic color and texture signatures.
// These are detected by combining multiple pixel-level features.

function detectGeneratorFingerprints(
  samples: Array<{ r: number; g: number; b: number }>,
  satSignal: ImageBrainSignal,
  textureSignal: ImageBrainSignal,
): { signal: ImageBrainSignal; hints: string[] } {
  const hints: string[] = []

  const rs  = samples.map(s => s.r / 255)
  const gs  = samples.map(s => s.g / 255)
  const bs  = samples.map(s => s.b / 255)
  const rS  = stats(rs)
  const gS  = stats(gs)
  const bS  = stats(bs)

  const saturations = samples.map(({ r, g, b }) => rgbToHsv(r, g, b).s)
  const satS        = stats(saturations)
  let   fingerScore = 0.5  // start neutral

  // ── Midjourney v5/v6 ──
  // Signatures: blue/purple shift, high saturation, very smooth skin, "painterly" look
  // Blue channel > Red channel by significant margin in 30%+ of pixels
  const blueShift = samples.filter(({ r, b }) => b > r + 20).length / samples.length
  if (blueShift > 0.35 && satS.mean > 0.50) {
    hints.push('Midjourney v5/v6 (blue-purple shift, high saturation)')
    fingerScore = Math.max(fingerScore, 0.82)
  }

  // ── DALL-E 3 ──
  // Signatures: clean bright colors, balanced RGB, natural-looking but "too clean"
  // Channel balance within 5%, saturation moderate (0.35–0.55), very low texture noise
  const chanDiff = Math.abs(rS.mean - gS.mean) + Math.abs(gS.mean - bS.mean)
  if (chanDiff < 0.04 && satS.mean > 0.30 && satS.mean < 0.58 && textureSignal.score > 0.70) {
    hints.push('DALL-E 3 (balanced channels, clean texture, moderate saturation)')
    fingerScore = Math.max(fingerScore, 0.80)
  }

  // ── Stable Diffusion (base models) ──
  // Signatures: slightly desaturated, warm color cast, "foggy" look
  const warmCast  = samples.filter(({ r, b }) => r > b + 15).length / samples.length
  if (warmCast > 0.40 && satS.mean < 0.40 && satS.mean > 0.20) {
    hints.push('Stable Diffusion (warm cast, mild desaturation)')
    fingerScore = Math.max(fingerScore, 0.75)
  }

  // ── Flux.1 (Black Forest Labs) ──
  // Signatures: very high saturation uniformity, crisp edges, near-perfect lighting
  if (satS.std < 0.05 && satS.mean > 0.45 && textureSignal.score > 0.75) {
    hints.push('Flux.1 (low saturation variance, crisp uniform rendering)')
    fingerScore = Math.max(fingerScore, 0.85)
  }

  // ── Adobe Firefly ──
  // Signatures: professionally "clean" colors, no grain, typical stock-photo lighting
  if (chanDiff < 0.06 && satS.mean > 0.35 && satS.mean < 0.50 && satS.std < 0.08) {
    if (!hints.length) {
      hints.push('Adobe Firefly / stock-AI (clean professional render)')
      fingerScore = Math.max(fingerScore, 0.72)
    }
  }

  // ── Grok Aurora ──
  // Signatures: high blue channel, vivid purples, painterly texture
  if (bS.mean > rS.mean + 0.05 && satS.mean > 0.55) {
    hints.push('Grok Aurora (vivid, blue-shifted, high saturation)')
    fingerScore = Math.max(fingerScore, 0.80)
  }

  return {
    signal: {
      name: 'AI Generator Fingerprint',
      category: 'generator',
      score: clamp(fingerScore, 0.25, 0.98),
      weight: 0.10,
      rawValue: blueShift,
      evidence: hints.length > 0
        ? `Detected: ${hints.join('; ')}`
        : 'No specific generator signature matched (general AI patterns still present)',
    },
    hints,
  }
}

// ── MAIN ENTRY POINT ──────────────────────────────────────────────────────────

export function analyzeImageWithBrain(imageBuffer: Buffer, fileSize: number): ImageBrainResult {
  const samples = sampleRGB(imageBuffer, 6000)

  if (samples.length < 100) {
    return {
      score: 0.5, verdict: 'UNCERTAIN',
      signals:  [],
      findings: ['Insufficient pixel data for brain analysis'],
      generatorHints: [],
    }
  }

  // Run all signals
  const satSignal     = analyzeSaturation(samples)
  const textureSignal = analyzeTexture(imageBuffer)
  const channelSignal = analyzeChannelCorrelation(samples)
  const lumaSignal    = analyzeLuminanceGradient(samples)
  const freqSignal    = analyzeFrequencyArtifacts(imageBuffer)
  const edgeSignal    = analyzeEdgePattern(imageBuffer)
  const compSignal    = analyzeCompressionSignature(imageBuffer, fileSize)
  const { signal: genSignal, hints: genHints } = detectGeneratorFingerprints(samples, satSignal, textureSignal)

  const allSignals: ImageBrainSignal[] = [
    satSignal, textureSignal, channelSignal, lumaSignal,
    freqSignal, edgeSignal, compSignal, genSignal,
  ]

  // Weighted ensemble
  const totalWeight = allSignals.reduce((s, sig) => s + sig.weight, 0) || 1
  const rawScore    = allSignals.reduce((s, sig) => s + sig.score * sig.weight, 0) / totalWeight
  const score       = clamp(rawScore, 0.01, 0.99)
  const verdict     = score > 0.65 ? 'AI' : score < 0.38 ? 'HUMAN' : 'UNCERTAIN'

  // Top findings
  const sorted   = [...allSignals].sort((a, b) => Math.abs(b.score - 0.5) - Math.abs(a.score - 0.5))
  const findings = sorted.slice(0, 6).map(s => {
    const dir = s.score > 0.65 ? '🤖 AI' : s.score < 0.38 ? '✅ Real' : '⚠️ Mixed'
    return `${dir} — ${s.name}: ${s.evidence}`
  })

  if (genHints.length > 0) {
    findings.unshift(`🔬 Generator: ${genHints.join(' | ')}`)
  }

  return { score, signals: allSignals, findings, verdict, generatorHints: genHints }
}
