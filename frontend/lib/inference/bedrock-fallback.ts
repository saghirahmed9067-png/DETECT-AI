/**
 * Aiscern — Gemini 2.0 Flash Fallback Engine
 *
 * Replaces Amazon Bedrock. Fires ONLY when ALL HuggingFace models are
 * cold/unavailable. Gemini 2.0 Flash is fast, free-tier (1500 req/day),
 * and has native vision support for image analysis.
 *
 * Required env var (add ONE key to Vercel):
 *   GEMINI_API_KEY  — from Google AI Studio (aistudio.google.com)
 *
 * Results are clearly labelled as "Gemini-Fallback" in model_used so
 * users know it's a fallback, not the fine-tuned HF classifier.
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

// Safety settings — disable blocks so detection prompts aren't refused
const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

const MODEL = 'gemini-2.0-flash'

// ── Shared JSON parser ────────────────────────────────────────────────────────
function parseGeminiJSON(raw: string): { ai_probability: number; verdict: string; reasoning: string; signals?: string[] } {
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

// ════════════════════════════════════════════════════════════════
// TEXT FALLBACK
// ════════════════════════════════════════════════════════════════
export interface BedrockTextResult {
  aiScore:   number
  verdict:   'AI' | 'HUMAN' | 'UNCERTAIN'
  reasoning: string
}

export async function bedrockAnalyzeText(text: string): Promise<BedrockTextResult> {
  const model = getClient().getGenerativeModel({ model: MODEL, safetySettings: SAFETY })

  const prompt = `You are an expert AI-generated text detection system.

Analyze the following text and determine if it was written by an AI (ChatGPT, Claude, Gemini, GPT-4 etc.) or by a human.

AI writing signals to look for:
- Unnaturally uniform sentence structure and length
- Overuse of transitions: "Furthermore", "Moreover", "In conclusion", "Additionally"  
- Generic hedged language lacking personal voice or specific lived experience
- Suspiciously perfect grammar with no natural errors or colloquialisms
- Repetitive phrasing patterns across paragraphs
- Lists structured too neatly with parallel phrasing
- Lacks genuine emotion, humour, or idiosyncratic word choices

TEXT TO ANALYZE:
"""
${text.substring(0, 2500)}
"""

Respond ONLY with valid JSON — no preamble, no text outside the JSON:
{"ai_probability": 0.0-1.0, "verdict": "AI"|"HUMAN"|"UNCERTAIN", "reasoning": "one sentence max"}`

  const result  = await model.generateContent(prompt)
  const raw     = result.response.text()
  const parsed  = parseGeminiJSON(raw)
  const aiScore = Math.max(0, Math.min(1, parsed.ai_probability ?? 0.5))
  const verdict = (['AI','HUMAN','UNCERTAIN'].includes(parsed.verdict)
    ? parsed.verdict : toVerdict(aiScore)) as 'AI' | 'HUMAN' | 'UNCERTAIN'

  return { aiScore, verdict, reasoning: parsed.reasoning ?? '' }
}

// ════════════════════════════════════════════════════════════════
// IMAGE FALLBACK
// ════════════════════════════════════════════════════════════════
export interface BedrockImageResult {
  aiScore:   number
  verdict:   'AI' | 'HUMAN' | 'UNCERTAIN'
  reasoning: string
  signals:   string[]
}

export async function bedrockAnalyzeImage(imageBuffer: Buffer, mimeType: string): Promise<BedrockImageResult> {
  const model = getClient().getGenerativeModel({ model: MODEL, safetySettings: SAFETY })

  const validMime = (['image/jpeg','image/png','image/webp','image/gif'] as const)
    .find(t => t === mimeType) ?? 'image/jpeg'

  const imagePart = {
    inlineData: {
      data:     imageBuffer.toString('base64'),
      mimeType: validMime,
    },
  }

  const prompt = `You are an expert AI-generated image detection system.

Analyze this image and determine if it was created by an AI generator (Midjourney, DALL-E 3, Stable Diffusion, Adobe Firefly, Grok Aurora, Gemini Imagen, Kling, Runway, Sora etc.) or is a real photograph/human-made artwork.

Check specifically for:
1. FACE/SKIN: Unnatural smoothness, plastic texture, wrong ear/teeth anatomy
2. HANDS: Incorrect finger count, fused or melted fingers, wrong proportions
3. BACKGROUND: Repeated objects, impossible geometry, blurred edges
4. LIGHTING: Shadows that contradict light source, missing reflections
5. TEXT: Garbled, nonsensical, or impossible text in the image
6. SYMMETRY: Unnaturally perfect facial symmetry
7. ARTIFACTS: GAN checkerboard patterns, diffusion blurriness at edges, seams
8. HAIR/FUR: Painted appearance rather than individual strands

Respond ONLY with valid JSON:
{"ai_probability": 0.0-1.0, "verdict": "AI"|"HUMAN"|"UNCERTAIN", "reasoning": "one sentence", "signals": ["signal1", "signal2"]}`

  const result  = await model.generateContent([prompt, imagePart])
  const raw     = result.response.text()
  const parsed  = parseGeminiJSON(raw)
  const aiScore = Math.max(0, Math.min(1, parsed.ai_probability ?? 0.5))
  const verdict = (['AI','HUMAN','UNCERTAIN'].includes(parsed.verdict)
    ? parsed.verdict : toVerdict(aiScore)) as 'AI' | 'HUMAN' | 'UNCERTAIN'

  return {
    aiScore,
    verdict,
    reasoning: parsed.reasoning ?? '',
    signals:   Array.isArray(parsed.signals) ? parsed.signals : [],
  }
}

// ── Availability check ────────────────────────────────────────────────────────
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
