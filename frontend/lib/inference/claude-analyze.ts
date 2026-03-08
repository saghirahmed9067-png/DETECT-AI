export interface DetectionSignal {
  name:        string
  category:    string
  description: string
  weight:      number
  value:       number
  flagged:     boolean
}

export interface SentenceScore {
  text:       string
  ai_score:   number
  perplexity: number
}

export interface SegmentScore {
  start_sec:  number
  end_sec:    number
  label:      string
  ai_score:   number
}

export interface DetectionResult {
  verdict:          'AI' | 'HUMAN' | 'UNCERTAIN'
  confidence:       number
  signals:          DetectionSignal[]
  summary:          string
  model_used:       string
  model_version:    string
  processing_time?: number
  sentence_scores?: SentenceScore[]
  segment_scores?:  SegmentScore[]
  frame_scores?:    { frame: number; time_sec: number; ai_score: number }[]
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

function buildSystemPrompt(mediaType: string): string {
  const prompts: Record<string, string> = {
    image: `You are an expert AI content forensics analyst specializing in detecting AI-generated images. 
Analyze for: GAN artifacts, unnatural textures, edge bleeding, inconsistent lighting/shadows, 
anatomical errors (fingers, eyes, teeth, hair), unrealistic backgrounds, tiling patterns, 
overly smooth surfaces, metadata anomalies, and diffusion model fingerprints.
Return ONLY valid JSON matching the schema exactly. No markdown, no explanation outside JSON.`,
    text: `You are an expert AI text detection specialist. Analyze text for:
Perplexity patterns (AI text tends to be lower), burstiness (AI is uniform, humans vary),
vocabulary diversity, sentence length distribution, stylistic consistency vs human variation,
repetitive phrasing, lack of personal experience/emotion, overly formal structure.
Also provide per-sentence AI scores. Return ONLY valid JSON. No markdown.`,
    audio: `You are an expert deepfake audio detection specialist. Analyze for:
TTS artifacts, unnatural prosody, robotic phoneme transitions, spectral gaps,
synthetic breathing patterns, pitch regularization, formant inconsistencies,
background noise artifacts, codec fingerprints from voice synthesis.
Return ONLY valid JSON. No markdown.`,
    video: `You are an expert deepfake video detection specialist. Analyze for:
Temporal inconsistencies between frames, face boundary artifacts, unnatural blinking,
expression micromovement anomalies, lighting inconsistencies across frames,
GAN fingerprints, compression artifact patterns from video synthesis models.
Return ONLY valid JSON. No markdown.`,
  }
  return prompts[mediaType] || prompts.text
}

function buildResponseSchema(mediaType: string): string {
  const baseSchema = `{
  "verdict": "AI" | "HUMAN" | "UNCERTAIN",
  "confidence": 0.0-1.0,
  "signals": [{"name": string, "category": string, "description": string, "weight": 0.0-1.0, "value": 0.0-1.0, "flagged": boolean}],
  "summary": string,
  "model_used": "claude-sonnet-4-20250514",
  "model_version": "1.0.0"`

  if (mediaType === 'text') {
    return baseSchema + `,\n  "sentence_scores": [{"text": string, "ai_score": 0.0-1.0, "perplexity": number}]\n}`
  }
  if (mediaType === 'audio') {
    return baseSchema + `,\n  "segment_scores": [{"start_sec": number, "end_sec": number, "label": string, "ai_score": 0.0-1.0}]\n}`
  }
  if (mediaType === 'video') {
    return baseSchema + `,\n  "frame_scores": [{"frame": number, "time_sec": number, "ai_score": 0.0-1.0}]\n}`
  }
  return baseSchema + '\n}'
}

export async function analyzeWithClaude(
  content: string | { type: 'image'; base64: string; mimeType: string },
  mediaType: 'image' | 'text' | 'audio' | 'video',
  extra?: string
): Promise<DetectionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const userContent: unknown[] = []

  if (typeof content === 'object' && content.type === 'image') {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: content.mimeType, data: content.base64 },
    })
    userContent.push({ type: 'text', text: `Analyze this image for AI generation artifacts. ${extra || ''}` })
  } else {
    userContent.push({
      type: 'text',
      text: `Analyze the following ${mediaType} content for AI generation:\n\n${content}\n\n${extra || ''}\n\nReturn JSON matching this exact schema:\n${buildResponseSchema(mediaType)}`,
    })
  }

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: buildSystemPrompt(mediaType) + `\n\nReturn JSON matching this schema:\n${buildResponseSchema(mediaType)}`,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  // Parse JSON - strip any markdown fences
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const result = JSON.parse(clean) as DetectionResult
  return result
}

// Simple rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, limit = 5, windowMs = 600000): boolean {
  const now  = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}
