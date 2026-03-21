/**
 * Aiscern — Audio Signal Engine v3.0
 * Deterministic spectral + file-level signals for TTS/voice-clone detection.
 * Runs alongside HF model — catches what wav2vec2 misses.
 *
 * Signals (7 total):
 *  1. Bitrate Uniformity          – TTS outputs at perfectly consistent bitrate
 *  2. Silence / Breath Pattern    – AI lacks natural pauses and breathing
 *  3. Audio Byte Entropy          – TTS is more compressible (lower entropy)
 *  4. Format Signature            – ElevenLabs/PlayHT typically export MP3@128kbps
 *  5. File Compression Ratio      – TTS files smaller per second than real speech
 *  6. Zero Crossing Rate Uniformity – TTS has unnaturally regular ZCR patterns
 *  7. Amplitude Envelope Smoothness – TTS lacks sharp plosive transients
 */

export interface AudioSignalResult {
  name:        string
  score:       number    // 0–1, higher = more AI/synthetic
  rawValue:    number
  weight:      number
  description: string
}

/**
 * Analyze raw audio bytes for synthetic voice signatures.
 * Works on raw PCM/WAV bytes and MP3/OGG/AAC compressed formats.
 */
export function extractAudioSignals(
  buf:      Buffer,
  fileSize: number,
  format:   string,
  fileName: string,
): AudioSignalResult[] {
  const bytes = new Uint8Array(buf)
  const fmt   = format.toLowerCase()
  const audioStart = fmt === 'wav' ? 44 : 0

  // ── 1. File-size / bitrate heuristic ─────────────────────────────────────
  const kb          = fileSize / 1024
  const durationEst = Math.max(1, kb / 16)   // ~128kbps assumption
  const bitrateKbps = (kb * 8) / durationEst
  let bitrateScore = 0.5
  if (bitrateKbps > 122 && bitrateKbps < 134) bitrateScore = 0.72   // exactly 128kbps = TTS
  else if (bitrateKbps > 60 && bitrateKbps < 68) bitrateScore = 0.68 // 64kbps TTS
  else if (bitrateKbps < 24) bitrateScore = 0.75                      // very low = compressed TTS
  else if (bitrateKbps > 200) bitrateScore = 0.25                     // high bitrate = real recording

  // ── 2. Format signature ───────────────────────────────────────────────────
  let formatScore = 0.4
  if (fmt === 'mp3' || fmt === 'aac' || fmt === 'm4a') formatScore = 0.55
  else if (fmt === 'wav' || fmt === 'flac') formatScore = 0.30
  else if (fmt === 'ogg') formatScore = 0.45

  // ── 3. Silence / breath pattern ──────────────────────────────────────────
  let silenceRatio = 0
  if (bytes.length > 100) {
    let zeroClusters = 0
    let inSilence    = false
    for (let i = audioStart; i < bytes.length; i += 4) {
      const amp = Math.abs(bytes[i] - 128)
      if (amp < 4) {
        if (!inSilence) { zeroClusters++; inSilence = true }
      } else { inSilence = false }
    }
    const totalBlocks = Math.floor((bytes.length - audioStart) / 4)
    silenceRatio = Math.min(1, zeroClusters / Math.max(totalBlocks * 0.01, 1))
  }
  let silenceScore = 0.5
  if (silenceRatio < 0.02) silenceScore = 0.75
  else if (silenceRatio < 0.05) silenceScore = 0.60
  else if (silenceRatio < 0.15) silenceScore = 0.42
  else silenceScore = 0.25

  // ── 4. Byte entropy of audio data ─────────────────────────────────────────
  const audioPart = bytes.slice(audioStart, audioStart + 8000)
  const freqArr   = new Array(256).fill(0)
  for (const b of audioPart) freqArr[b]++
  let h = 0
  for (const f of freqArr) {
    if (f > 0) { const p = f / audioPart.length; h -= p * Math.log2(p) }
  }
  let entropyScore = 0.5
  if (h < 5.5) entropyScore = 0.80
  else if (h < 6.2) entropyScore = 0.65
  else if (h < 7.0) entropyScore = 0.48
  else entropyScore = 0.28

  // ── 5. File size absolute ─────────────────────────────────────────────────
  let sizeScore = 0.5
  if (kb < 100)  sizeScore = 0.65
  else if (kb < 500)  sizeScore = 0.52
  else if (kb < 2000) sizeScore = 0.42
  else sizeScore = 0.28

  // ── 6. Zero Crossing Rate Uniformity ─────────────────────────────────────
  // TTS has very regular ZCR patterns (synthesized, periodic rhythm).
  // Real speech has irregular ZCR (natural variation from breathing, room acoustics).
  let zcrScore = 0.5
  let zcrCV    = 0.5  // raw coefficient of variation
  if (bytes.length > audioStart + 512 * 4) {
    const windowSize  = 512
    const frameZCRs: number[] = []

    for (let offset = audioStart; offset + windowSize < bytes.length; offset += windowSize) {
      let crossings = 0
      for (let i = offset + 1; i < offset + windowSize; i++) {
        const prev = bytes[i - 1] - 128  // center at 0
        const curr = bytes[i]     - 128
        if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) crossings++
      }
      frameZCRs.push(crossings / windowSize)
    }

    if (frameZCRs.length >= 4) {
      const mean     = frameZCRs.reduce((a, b) => a + b, 0) / frameZCRs.length
      const variance = frameZCRs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / frameZCRs.length
      zcrCV          = Math.sqrt(variance) / Math.max(mean, 0.001)

      // TTS: low CV (uniform ZCR) → high AI score
      // Real speech: high CV (variable ZCR) → low AI score
      zcrScore = Math.min(0.95, Math.max(0.05, 1 - Math.min(1, zcrCV * 4)))
    }
  }

  // ── 7. Amplitude Envelope Smoothness ─────────────────────────────────────
  // Real speech has sharp amplitude spikes (plosives like "p", "b", "t", "k").
  // TTS has smooth, controlled amplitude with few transients.
  let envelopeScore   = 0.5
  let transientRate   = 0.5  // raw value for calibration
  if (bytes.length > audioStart + 20) {
    const step = Math.max(1, Math.floor((bytes.length - audioStart) / 2000))
    const envelope: number[] = []
    for (let i = audioStart; i < bytes.length; i += step) {
      envelope.push(Math.abs(bytes[i] - 128))
    }

    if (envelope.length >= 20) {
      let transients = 0
      for (let i = 1; i < envelope.length; i++) {
        if (Math.abs(envelope[i] - envelope[i - 1]) > 30) transients++
      }
      transientRate = transients / envelope.length

      // Low transient rate = smooth TTS = high AI score
      envelopeScore = Math.min(0.95, Math.max(0.05, 1 - Math.min(1, transientRate * 20)))
    }
  }

  // Weights adjusted proportionally from original 5 signals to 7 (sum = 1.0)
  return [
    {
      name:        'Bitrate Uniformity',
      score:       bitrateScore,
      rawValue:    bitrateKbps,
      weight:      0.20,
      description: 'TTS systems output at perfectly consistent bitrates; real speech has variable encoding',
    },
    {
      name:        'Silence / Breath Pattern',
      score:       silenceScore,
      rawValue:    silenceRatio,
      weight:      0.20,
      description: 'AI voice lacks natural pauses and breathing; continuous speech is a TTS fingerprint',
    },
    {
      name:        'Audio Byte Entropy',
      score:       entropyScore,
      rawValue:    h,
      weight:      0.18,
      description: 'AI-synthesized audio is more compressible (lower entropy) than natural human speech',
    },
    {
      name:        'Format Signature',
      score:       formatScore,
      rawValue:    fmt === 'mp3' ? 1 : fmt === 'wav' ? 0 : 0.5,
      weight:      0.12,
      description: 'ElevenLabs, PlayHT, XTTS v2 typically export MP3 @ 128kbps; real recordings use WAV/FLAC',
    },
    {
      name:        'File Compression Ratio',
      score:       sizeScore,
      rawValue:    kb,
      weight:      0.12,
      description: 'TTS outputs are smaller per second than real speech recordings due to reduced noise floor',
    },
    {
      name:        'Zero Crossing Rate Uniformity',
      score:       zcrScore,
      rawValue:    zcrCV,
      weight:      0.10,
      description: 'TTS synthesis produces unnaturally regular zero-crossing patterns; real speech has organic ZCR variation from breathing and room acoustics',
    },
    {
      name:        'Amplitude Envelope Smoothness',
      score:       envelopeScore,
      rawValue:    transientRate,
      weight:      0.08,
      description: 'Real speech has sharp amplitude transients from plosive consonants (p, b, t, k); TTS outputs have smooth, controlled envelopes with few sudden spikes',
    },
  ]
}

export function aggregateAudioSignals(signals: AudioSignalResult[]): number {
  const totalW = signals.reduce((s, sig) => s + sig.weight, 0)
  return signals.reduce((s, sig) => s + sig.score * sig.weight, 0) / totalW
}


// ── CALIBRATION SUPPORT ───────────────────────────────────────────────────────
import type { AudioCalibrationStats } from '../calibration-client'
import { calibratedScore }            from '../calibration-client'

export function applyAudioCalibration(
  signals: AudioSignalResult[],
  cal:     AudioCalibrationStats,
): AudioSignalResult[] {
  const sigMap: Record<string, { aiM: number; aiS: number; realM: number; realS: number }> = {
    'Bitrate Uniformity': {
      aiM: cal.bitrate_ai_mean, aiS: cal.bitrate_ai_std,
      realM: cal.bitrate_real_mean, realS: cal.bitrate_real_std,
    },
    'Silence / Breath Pattern': {
      aiM: cal.silence_ai_mean, aiS: cal.silence_ai_std,
      realM: cal.silence_real_mean, realS: cal.silence_real_std,
    },
    'Audio Byte Entropy': {
      aiM: cal.entropy_ai_mean, aiS: cal.entropy_ai_std,
      realM: cal.entropy_real_mean, realS: cal.entropy_real_std,
    },
    'File Compression Ratio': {
      aiM: cal.filesize_ai_mean, aiS: cal.filesize_ai_std,
      realM: cal.filesize_real_mean, realS: cal.filesize_real_std,
    },
  }
  return signals.map(sig => {
    const ref = sigMap[sig.name]
    if (!ref) return sig
    const calibrated = calibratedScore(sig.rawValue, ref.aiM, ref.aiS, ref.realM, ref.realS)
    return { ...sig, score: calibrated }
  })
}
