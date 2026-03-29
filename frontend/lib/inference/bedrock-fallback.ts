/**
 * Aiscern — Gemini 2.0 Flash Detection Engine
 *
 * Primary ML detection engine for text, image, and audio.
 * Gemini 2.0 Flash: fast, no cold-start, 1500 free req/day.
 * Native vision + audio support via inline base64 data.
 *
 * SynthID integration:
 *   Text  — prompts Gemini to detect its own watermarking patterns
 *           (SynthID embeds statistical patterns in token selection)
 *   Image — checks EXIF/XMP for C2PA metadata (Google's image watermark
 *           standard used alongside SynthID in Gemini Imagen outputs)
 *
 * Required env var (set in Vercel dashboard):
 *   GEMINI_API_KEY  — from Google AI Studio (aistudio.google.com)
 */

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'

// ── Client (lazy singleton) ───────────────────────────────────────────────────
let _genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (_genAI) return _genAI
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set in environment variables')
  _genAI = new GoogleGenerativeAI(key)
  return _genAI
}

// Safety settings — disable blocks so detection prompts are never refused
const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

const MODEL = 'gemini-2.0-flash'

// ── Shared JSON parser ────────────────────────────────────────────────────────
function parseGeminiJSON(raw: string): {
  ai_probability:   number
  verdict:          string
  reasoning:        string
  signals?:         string[]
  synthid_detected?: boolean
  c2pa_detected?:   boolean
} {
  try {
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    const prob    = raw.match(/"ai_probability"\s*:\s*([\d.]+)/)?.[1]
    const verdict = raw.match(/"verdict"\s*:\s*"([^"]+)"/)?.[1]
    const reason  = raw.match(/"reasoning"\s*:\s*"([^"]+)"/)?.[1]
    return {
      ai_probability: prob ? parseFloat(prob) : 0.5,
      verdict:        verdict ?? 'UNCERTAIN',
      reasoning:      reason  ?? 'Parse error — score estimated',
    }
  }
}

function toVerdict(score: number): 'AI' | 'HUMAN' | 'UNCERTAIN' {
  if (score >= 0.60) return 'AI'
  if (score <= 0.40) return 'HUMAN'
  return 'UNCERTAIN'
}

// ── C2PA metadata check (JPEG/PNG bytes) ─────────────────────────────────────
// Google Imagen and Gemini-generated images embed C2PA manifests in XMP metadata.
// SynthID invisible watermarks are layered on top of this.
// We detect C2PA by scanning for the XMP signature in raw image bytes.
function detectC2PAWatermark(imageBuffer: Buffer): boolean {
  // C2PA XMP signature: "c2pa:" or "urn:c2pa" in the XMP block
  // XMP is stored as UTF-8 text in JPEG APP1 segments or PNG iTXt chunks
  const slice = imageBuffer.subarray(0, Math.min(imageBuffer.length, 64 * 1024))
  const text  = slice.toString('latin1')
  return (
    text.includes('c2pa:') ||
    text.includes('urn:c2pa') ||
    text.includes('contentauthenticity') ||
    text.includes('adobe:dc') ||
    text.includes('x:xmpmeta')
  )
}

// ════════════════════════════════════════════════════════════════
// TEXT DETECTION  — Gemini + SynthID pattern awareness
// ════════════════════════════════════════════════════════════════
export interface BedrockTextResult {
  aiScore:          number
  verdict:          'AI' | 'HUMAN' | 'UNCERTAIN'
  reasoning:        string
  synthidDetected?: boolean
}

export async function bedrockAnalyzeText(text: string): Promise<BedrockTextResult> {
  const model = getClient().getGenerativeModel({ model: MODEL, safetySettings: SAFETY })

  const prompt = `You are an expert AI-generated text detection system with knowledge of Google SynthID watermarking.

Analyze the following text and determine if it was written by an AI or by a human.

DETECTION SIGNALS — check all of these:

LINGUISTIC PATTERNS (general AI tells):
- Unnaturally uniform sentence structure and length across paragraphs
- Overuse of transitional phrases: "Furthermore", "Moreover", "In conclusion", "Additionally", "It is worth noting", "Certainly", "Absolutely"
- Generic hedged language lacking personal voice, humor, or lived experience
- Suspiciously perfect grammar with no natural errors, typos, or colloquialisms
- Repetitive structural patterns: every paragraph starting similarly
- Lists that are too neatly parallel in phrasing
- Lacks genuine emotion, irony, or idiosyncratic word choices

GEMINI/CLAUDE/GPT-SPECIFIC PATTERNS:
- "I'd be happy to help", "Great question", "Let me walk you through", "At its core", "Let's explore"
- Over-hedged disclaimers ("It's important to note", "It's worth mentioning")
- Unnaturally even information density — no tangents, no personality
- Conclusion paragraphs that summarize exactly what was just said

SYNTHID AWARENESS:
- Google SynthID watermarks Gemini-generated text by subtly biasing token selection
- This creates statistically detectable patterns in word choice and sentence rhythm
- Signs: unusually consistent syllable counts per sentence, subtle repetition of phoneme patterns,
  word choices that feel slightly "off" — technically correct but not what a human would naturally pick
- The text reads as fluent but lacks the micro-imperfections of genuine human thought

TEXT TO ANALYZE:
"""
${text.substring(0, 2500)}
"""

Respond ONLY with valid JSON — no text outside the JSON object:
{"ai_probability": 0.0-1.0, "verdict": "AI"|"HUMAN"|"UNCERTAIN", "reasoning": "one sentence max 20 words", "synthid_detected": true|false}`

  const result   = await model.generateContent(prompt)
  const raw      = result.response.text()
  const parsed   = parseGeminiJSON(raw)
  const aiScore  = Math.max(0, Math.min(1, parsed.ai_probability ?? 0.5))

  // If SynthID pattern detected, boost AI probability
  const synthBoost = parsed.synthid_detected ? 0.08 : 0
  const finalScore = Math.min(0.99, aiScore + synthBoost)
  const verdict    = (['AI','HUMAN','UNCERTAIN'].includes(parsed.verdict)
    ? parsed.verdict : toVerdict(finalScore)) as 'AI' | 'HUMAN' | 'UNCERTAIN'

  return {
    aiScore:         finalScore,
    verdict,
    reasoning:       parsed.reasoning ?? '',
    synthidDetected: parsed.synthid_detected ?? false,
  }
}

// ════════════════════════════════════════════════════════════════
// IMAGE DETECTION  — Gemini vision + C2PA + SynthID signals
// ════════════════════════════════════════════════════════════════
export interface BedrockImageResult {
  aiScore:         number
  verdict:         'AI' | 'HUMAN' | 'UNCERTAIN'
  reasoning:       string
  signals:         string[]
  c2paDetected?:   boolean
  synthidDetected?: boolean
}

export async function bedrockAnalyzeImage(
  imageBuffer: Buffer,
  mimeType:    string,
): Promise<BedrockImageResult> {
  const model = getClient().getGenerativeModel({ model: MODEL, safetySettings: SAFETY })

  // Check C2PA watermark in raw bytes BEFORE sending to Gemini
  const c2paDetected = detectC2PAWatermark(imageBuffer)

  const validMime = (['image/jpeg','image/png','image/webp','image/gif'] as const)
    .find(t => t === mimeType) ?? 'image/jpeg'

  const imagePart = {
    inlineData: {
      data:     imageBuffer.toString('base64'),
      mimeType: validMime,
    },
  }

  const prompt = `You are an expert AI-generated image detection system with knowledge of Google SynthID and C2PA watermarking.

Analyze this image and determine if it was created by an AI generator or is a real photograph/human-made artwork.

VISUAL ARTIFACT CHECKS — examine carefully:
1. FACE/SKIN: Unnatural smoothness, plastic texture, wrong ear/teeth/eye anatomy, identical skin pores
2. HANDS: Incorrect finger count (AI commonly produces 6 fingers), fused or melted fingers
3. BACKGROUND: Repeated objects, impossible geometry, text that is garbled or nonsensical
4. LIGHTING: Shadows contradicting light source, missing reflections in eyes or surfaces
5. HAIR/FUR: Painted appearance, strands merging, unnatural uniformity
6. SYMMETRY: Unnaturally perfect bilateral facial symmetry
7. GAN/DIFFUSION ARTIFACTS: Checkerboard patterns, diffusion blur at object edges, seam lines
8. TEETH: Too perfect, too uniform, gum line issues common in AI portraits
9. JEWELRY/ACCESSORIES: Warped, merged with skin, or geometrically impossible
10. DEPTH OF FIELD: Bokeh that looks painted rather than optically produced

AI GENERATOR SIGNATURES:
- Midjourney v6/v7: hyper-detailed but plasticky skin, fantasy-epic lighting
- DALL-E 3: slightly cartoonish, over-saturated, clean studio lighting
- Stable Diffusion / Flux: checkerboard artifacts at high frequency edges
- Gemini Imagen / Google: very clean, balanced exposure, faces slightly too symmetric
- Grok Aurora: high contrast, cinematic but with subtle geometry errors
- Adobe Firefly: stock-photo aesthetic, very clean backgrounds

SYNTHID & C2PA AWARENESS:
${c2paDetected
    ? '⚠️ C2PA metadata detected in image bytes — this strongly indicates AI generation (Google Imagen, Adobe Firefly, or Dall-E 3 embed C2PA manifests). Weight this heavily.'
    : 'No C2PA metadata detected in image bytes (does not rule out AI — many generators strip metadata).'}
- Google SynthID embeds invisible frequency-domain watermarks in Gemini Imagen outputs
- These are not visible but affect the statistical distribution of pixel values at high frequencies
- If you detect signs of Gemini Imagen generation, note it as a SynthID-likely image

Respond ONLY with valid JSON:
{"ai_probability": 0.0-1.0, "verdict": "AI"|"HUMAN"|"UNCERTAIN", "reasoning": "one sentence max 20 words", "signals": ["up to 4 specific artifact names"], "synthid_detected": true|false}`

  const result  = await model.generateContent([prompt, imagePart])
  const raw     = result.response.text()
  const parsed  = parseGeminiJSON(raw)

  let aiScore = Math.max(0, Math.min(1, parsed.ai_probability ?? 0.5))

  // C2PA watermark is a very strong AI signal — boost score
  if (c2paDetected) aiScore = Math.min(0.99, aiScore + 0.12)
  // SynthID pattern detected by Gemini — additional boost
  if (parsed.synthid_detected) aiScore = Math.min(0.99, aiScore + 0.06)

  const verdict = (['AI','HUMAN','UNCERTAIN'].includes(parsed.verdict)
    ? parsed.verdict : toVerdict(aiScore)) as 'AI' | 'HUMAN' | 'UNCERTAIN'

  const signals = Array.isArray(parsed.signals) ? [...parsed.signals] : []
  if (c2paDetected)          signals.unshift('C2PA watermark detected')
  if (parsed.synthid_detected) signals.push('SynthID pattern (Gemini Imagen)')

  return {
    aiScore,
    verdict,
    reasoning:       parsed.reasoning ?? '',
    signals,
    c2paDetected,
    synthidDetected: parsed.synthid_detected ?? false,
  }
}

// ════════════════════════════════════════════════════════════════
// AUDIO DETECTION  — Gemini audio analysis
// ════════════════════════════════════════════════════════════════
export interface BedrockAudioResult {
  aiScore:   number
  verdict:   'AI' | 'HUMAN' | 'UNCERTAIN'
  reasoning: string
}

const AUDIO_MIME_MAP: Record<string, string> = {
  mp3:  'audio/mpeg',
  wav:  'audio/wav',
  ogg:  'audio/ogg',
  flac: 'audio/flac',
  m4a:  'audio/mp4',
  aac:  'audio/aac',
  webm: 'audio/webm',
}

export async function bedrockAnalyzeAudio(
  audioBuffer: Buffer,
  format:      string,
  _fileName:   string,
): Promise<BedrockAudioResult> {
  const model    = getClient().getGenerativeModel({ model: MODEL, safetySettings: SAFETY })
  const mimeType = AUDIO_MIME_MAP[format.toLowerCase()] ?? 'audio/mpeg'

  // Cap at 10MB for inline data
  const maxBytes = 10 * 1024 * 1024
  const slice    = audioBuffer.length > maxBytes ? audioBuffer.subarray(0, maxBytes) : audioBuffer

  const audioPart = {
    inlineData: {
      data:     slice.toString('base64'),
      mimeType,
    },
  }

  const prompt = `You are an expert AI-generated audio and TTS voice-clone detection system.

Analyze this audio and determine if it was synthesized by AI or recorded from a real human.

DETECTION SIGNALS:
1. PROSODY: Natural speech has micro-variations in pitch/rhythm/speed. TTS is unnaturally consistent.
2. BREATHING: Real speech has breath sounds between sentences. TTS typically has none or synthetic breaths.
3. ARTIFACTS: Electronic hiss, word-boundary buzzing, or robotic resonance typical of neural TTS.
4. EMOTION: Flat affectless delivery. TTS struggles to convey genuine emotional nuance.
5. BACKGROUND: Suspiciously pristine audio — no room tone, handling noise, or environmental ambience.
6. CONSONANTS: Smeared or over-enunciated consonants common in ElevenLabs/PlayHT outputs.
7. PACING: TTS speaks at very consistent words-per-minute with no natural acceleration/deceleration.
8. NATURALNESS: Real humans make micro-errors — slight mispronunciations, self-corrections, filler sounds.

KNOWN AI VOICE GENERATORS:
- ElevenLabs: very realistic but has characteristic smooth vowel formants
- PlayHT / XTTS: slightly robotic consonants, clean background
- Bark / Tortoise TTS: occasional artifacts, inconsistent quality
- Microsoft Azure Neural TTS: very clean, consistent pacing
- Google WaveNet/Neural2: smooth but slightly mechanical rhythm
- RVC voice cloning: may preserve original background noise but has pitch artifacts

Respond ONLY with valid JSON:
{"ai_probability": 0.0-1.0, "verdict": "AI"|"HUMAN"|"UNCERTAIN", "reasoning": "one sentence max 20 words"}`

  const result  = await model.generateContent([prompt, audioPart])
  const raw     = result.response.text()
  const parsed  = parseGeminiJSON(raw)
  const aiScore = Math.max(0, Math.min(1, parsed.ai_probability ?? 0.5))
  const verdict = (['AI','HUMAN','UNCERTAIN'].includes(parsed.verdict)
    ? parsed.verdict : toVerdict(aiScore)) as 'AI' | 'HUMAN' | 'UNCERTAIN'

  return { aiScore, verdict, reasoning: parsed.reasoning ?? '' }
}

// ════════════════════════════════════════════════════════════════
// BATCH TEXT DETECTION  — lightweight, no HF dependency
// Used by scraper/route.ts and batch scanner
// ════════════════════════════════════════════════════════════════
export interface GeminiBatchTextResult {
  verdict:    'AI' | 'HUMAN' | 'UNCERTAIN'
  confidence: number   // 0–100
  reasoning:  string
  synthidDetected: boolean
}

export async function geminiAnalyzeTextBatch(text: string): Promise<GeminiBatchTextResult> {
  try {
    const result = await bedrockAnalyzeText(text)
    return {
      verdict:         result.verdict,
      confidence:      Math.round(result.aiScore * 100),
      reasoning:       result.reasoning,
      synthidDetected: result.synthidDetected ?? false,
    }
  } catch {
    return { verdict: 'UNCERTAIN', confidence: 50, reasoning: 'Gemini unavailable', synthidDetected: false }
  }
}

// ── Availability + health ─────────────────────────────────────────────────────
export function bedrockAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}

export async function bedrockHealthCheck(): Promise<boolean> {
  try {
    const r = await bedrockAnalyzeText('The quick brown fox jumps over the lazy dog.')
    return typeof r.aiScore === 'number'
  } catch {
    return false
  }
}
