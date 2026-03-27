/**
 * Aiscern — Amazon Bedrock Fallback Inference
 *
 * Used when ALL HuggingFace models are cold/down.
 * Prompts Claude 3 Haiku (cheapest/fastest) on Bedrock to classify content.
 *
 * Results are clearly labelled as "Bedrock-preliminary" in model_used.
 * Less accurate than fine-tuned HF classifiers — used as a safety net only.
 *
 * Required env vars (add to Vercel):
 *   AWS_ACCESS_KEY_ID      — from AWS IAM → your user → Security Credentials
 *   AWS_SECRET_ACCESS_KEY  — same place
 *   AWS_REGION             — e.g. us-east-1 (must have Bedrock access)
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

// ── Client (lazy singleton) ───────────────────────────────────────────────────
let _client: BedrockRuntimeClient | null = null

function getClient(): BedrockRuntimeClient {
  if (_client) return _client
  const region    = process.env.AWS_REGION          || 'us-east-1'
  const accessKey = process.env.AWS_ACCESS_KEY_ID
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!accessKey || !secretKey) throw new Error('AWS credentials not configured')
  _client = new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })
  return _client
}

// ── Model to use ─────────────────────────────────────────────────────────────
// Claude 3 Haiku = fastest + cheapest on Bedrock. Change to claude-3-5-sonnet
// for higher accuracy if budget allows.
const BEDROCK_MODEL = process.env.AWS_BEDROCK_MODEL_ID
  || 'anthropic.claude-3-haiku-20240307-v1:0'

// ── Shared invoker ────────────────────────────────────────────────────────────
async function invokeClaudeHaiku(prompt: string): Promise<string> {
  const client = getClient()
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 200,
    temperature: 0.05,
    messages: [{ role: 'user', content: prompt }],
  })
  const cmd = new InvokeModelCommand({
    modelId:     BEDROCK_MODEL,
    contentType: 'application/json',
    accept:      'application/json',
    body:        Buffer.from(body),
  })
  const res  = await client.send(cmd)
  const json = JSON.parse(Buffer.from(res.body).toString('utf-8'))
  return json?.content?.[0]?.text ?? ''
}

// ── Text Fallback ────────────────────────────────────────────────────────────
export interface BedrockTextResult {
  aiScore:   number          // 0–1
  verdict:   'AI' | 'HUMAN' | 'UNCERTAIN'
  reasoning: string
}

export async function bedrockAnalyzeText(text: string): Promise<BedrockTextResult> {
  const sample = text.substring(0, 2000)
  const prompt = `You are an expert AI-generated text detector.

Analyze the following text and determine if it was written by an AI (ChatGPT, Claude, Gemini, etc.) or by a human.

Look for these AI signals:
- Overly uniform sentence length and structure
- Excessive use of transition words (furthermore, however, additionally)
- Generic, hedged language lacking personal voice
- Perfect grammar with no natural errors or colloquialisms
- Repetitive phrasing patterns
- Lists structured too neatly

TEXT TO ANALYZE:
"""
${sample}
"""

Respond ONLY with valid JSON, no other text:
{"ai_probability": 0.0-1.0, "verdict": "AI"|"HUMAN"|"UNCERTAIN", "reasoning": "one sentence"}`

  const raw = await invokeClaudeHaiku(prompt)
  const clean = raw.replace(/```json\n?|\n?```/g, '').trim()

  try {
    const parsed = JSON.parse(clean) as {
      ai_probability: number
      verdict: string
      reasoning: string
    }
    const aiScore = Math.max(0, Math.min(1, parsed.ai_probability ?? 0.5))
    const verdict = (['AI', 'HUMAN', 'UNCERTAIN'].includes(parsed.verdict)
      ? parsed.verdict
      : aiScore >= 0.58 ? 'AI' : aiScore <= 0.42 ? 'HUMAN' : 'UNCERTAIN'
    ) as 'AI' | 'HUMAN' | 'UNCERTAIN'
    return { aiScore, verdict, reasoning: parsed.reasoning ?? '' }
  } catch {
    // Parse fallback
    const scoreMatch = clean.match(/"?ai_probability"?\s*:\s*([\d.]+)/)
    const aiScore    = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5
    return {
      aiScore,
      verdict: aiScore >= 0.58 ? 'AI' : aiScore <= 0.42 ? 'HUMAN' : 'UNCERTAIN',
      reasoning: 'Bedrock response parse error — score estimated',
    }
  }
}

// ── Image Fallback ────────────────────────────────────────────────────────────
export interface BedrockImageResult {
  aiScore:   number
  verdict:   'AI' | 'HUMAN' | 'UNCERTAIN'
  reasoning: string
  signals:   string[]
}

export async function bedrockAnalyzeImage(imageBuffer: Buffer, mimeType: string): Promise<BedrockImageResult> {
  // Bedrock Claude accepts base64 images directly
  const base64 = imageBuffer.toString('base64')
  const mediaType = (mimeType === 'image/png' ? 'image/png'
    : mimeType === 'image/webp' ? 'image/webp'
    : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

  const client = getClient()
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 300,
    temperature: 0.05,
    messages: [{
      role: 'user',
      content: [
        {
          type:   'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `You are an expert AI-generated image detector.

Analyze this image for signs of AI generation (Midjourney, DALL-E, Stable Diffusion, Firefly, Grok Aurora etc).

Check for:
- Unnatural skin texture or plastic-like smoothness
- Incorrect hand anatomy (wrong finger count, fused fingers)
- Inconsistent lighting or impossible shadows
- Background objects that are blurred/distorted/repeated
- Text in the image that is garbled or nonsensical
- Perfect symmetry that is unnatural
- GAN checkerboard artifacts in smooth areas
- Hair or fur that looks painted rather than individual strands

Respond ONLY with valid JSON, no other text:
{"ai_probability": 0.0-1.0, "verdict": "AI"|"HUMAN"|"UNCERTAIN", "reasoning": "one sentence", "signals": ["signal1","signal2"]}`,
        },
      ],
    }],
  })

  const cmd = new InvokeModelCommand({
    modelId:     BEDROCK_MODEL,
    contentType: 'application/json',
    accept:      'application/json',
    body:        Buffer.from(body),
  })

  const res  = await client.send(cmd)
  const json = JSON.parse(Buffer.from(res.body).toString('utf-8'))
  const raw  = json?.content?.[0]?.text ?? ''
  const clean = raw.replace(/```json\n?|\n?```/g, '').trim()

  try {
    const parsed = JSON.parse(clean) as {
      ai_probability: number
      verdict:        string
      reasoning:      string
      signals:        string[]
    }
    const aiScore = Math.max(0, Math.min(1, parsed.ai_probability ?? 0.5))
    const verdict = (['AI', 'HUMAN', 'UNCERTAIN'].includes(parsed.verdict)
      ? parsed.verdict
      : aiScore >= 0.58 ? 'AI' : aiScore <= 0.42 ? 'HUMAN' : 'UNCERTAIN'
    ) as 'AI' | 'HUMAN' | 'UNCERTAIN'
    return {
      aiScore,
      verdict,
      reasoning: parsed.reasoning ?? '',
      signals:   Array.isArray(parsed.signals) ? parsed.signals : [],
    }
  } catch {
    const scoreMatch = clean.match(/"?ai_probability"?\s*:\s*([\d.]+)/)
    const aiScore    = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5
    return {
      aiScore,
      verdict:   aiScore >= 0.58 ? 'AI' : aiScore <= 0.42 ? 'HUMAN' : 'UNCERTAIN',
      reasoning: 'Bedrock response parse error',
      signals:   [],
    }
  }
}

// ── Health check — call this to verify credentials are working ────────────────
export async function bedrockHealthCheck(): Promise<boolean> {
  try {
    const result = await bedrockAnalyzeText('The quick brown fox jumps over the lazy dog.')
    return typeof result.aiScore === 'number'
  } catch {
    return false
  }
}
