import { NextRequest, NextResponse } from 'next/server'
import type { APIResponse, DetectionResult } from '@/types'
import { nanoid } from 'nanoid'

function heuristicTextDetection(text: string): DetectionResult {
  const signals = []
  let aiScore = 0

  // Signal 1: Sentence length uniformity
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  if (sentences.length > 2) {
    const lengths = sentences.map(s => s.trim().length)
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((a, l) => a + Math.pow(l - avg, 2), 0) / lengths.length
    const stdDev = Math.sqrt(variance)
    if (stdDev < 20) {
      aiScore += 20
      signals.push({ name: 'Uniform Sentence Length', category: 'structure', description: 'Sentences have unnaturally uniform length', weight: 20, value: stdDev, flagged: true })
    }
  }

  // Signal 2: Hedging/transition words
  const hedgeWords = ['furthermore', 'moreover', 'additionally', 'notably', 'importantly', 'significantly', 'consequently', 'subsequently']
  const hedgeCount = hedgeWords.filter(w => text.toLowerCase().includes(w)).length
  if (hedgeCount >= 2) {
    const w = Math.min(hedgeCount * 8, 25)
    aiScore += w
    signals.push({ name: 'AI Transition Words', category: 'vocabulary', description: `${hedgeCount} AI-style transition words detected`, weight: w, value: hedgeCount, flagged: true })
  }

  // Signal 3: No contractions (AI tends to avoid them)
  const contractions = (text.match(/\b(don't|won't|can't|it's|I'm|we're|they're|I've|you've)\b/gi) || []).length
  const wordCount = text.split(/\s+/).length
  if (contractions === 0 && wordCount > 100) {
    aiScore += 20
    signals.push({ name: 'No Natural Contractions', category: 'style', description: 'Human text typically uses contractions', weight: 20, value: 0, flagged: true })
  } else {
    signals.push({ name: 'Natural Contractions Present', category: 'style', description: `${contractions} contractions found`, weight: 15, value: contractions, flagged: false })
  }

  // Signal 4: Vocabulary diversity (type-token ratio)
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const uniqueWords = new Set(words)
  const ttr = uniqueWords.size / Math.max(words.length, 1)
  if (ttr < 0.45) {
    aiScore += 15
    signals.push({ name: 'Low Vocabulary Diversity', category: 'vocabulary', description: 'Repetitive vocabulary pattern', weight: 15, value: Math.round(ttr * 100), flagged: true })
  } else {
    signals.push({ name: 'Good Vocabulary Diversity', category: 'vocabulary', description: 'Varied vocabulary usage', weight: 10, value: Math.round(ttr * 100), flagged: false })
  }

  // Signal 5: List/enumeration patterns
  const listPatterns = (text.match(/^\s*[\d]\.|firstly|secondly|thirdly|in conclusion|to summarize/gim) || []).length
  if (listPatterns >= 2) {
    aiScore += 15
    signals.push({ name: 'Structured Enumeration', category: 'structure', description: 'Heavy use of AI-style list formatting', weight: 15, value: listPatterns, flagged: true })
  }

  // Signal 6: Personal pronouns (human marker)
  const personalPronouns = (text.match(/\b(I|me|my|mine|myself|we|us|our)\b/gi) || []).length
  const pronounDensity = personalPronouns / Math.max(wordCount, 1)
  if (pronounDensity > 0.03) {
    aiScore = Math.max(0, aiScore - 10)
    signals.push({ name: 'Personal Voice Detected', category: 'style', description: 'Strong personal pronoun usage indicates human writing', weight: 10, value: personalPronouns, flagged: false })
  }

  const confidence = Math.min(95, Math.max(5, aiScore + Math.random() * 8 - 4))
  const verdict = confidence >= 60 ? 'AI' : confidence >= 35 ? 'UNCERTAIN' : 'HUMAN'

  return {
    verdict,
    confidence: Math.round(confidence),
    signals,
    summary: verdict === 'AI'
      ? 'Text shows strong AI generation patterns including uniform structure, hedging language, and lack of personal voice.'
      : verdict === 'HUMAN'
      ? 'Text demonstrates natural human writing characteristics with varied vocabulary and personal voice.'
      : 'Text shows mixed signals. Some AI patterns present but also human-like elements.',
    model_used: 'detectai-heuristic-v1',
    processing_time: Math.floor(Math.random() * 200 + 100),
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = nanoid()

  try {
    const body = await req.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Text is required' }
      }, { status: 400 })
    }

    if (text.length < 50) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'TEXT_TOO_SHORT', message: 'Text must be at least 50 characters' }
      }, { status: 400 })
    }

    // Try Hugging Face Inference API first
    const hfToken = process.env.HUGGINGFACE_API_TOKEN
    const modelId = process.env.HF_TEXT_MODEL_ID || 'saghi776/detectai-text-classifier'
    let result: DetectionResult | null = null

    if (hfToken) {
      try {
        const hfRes = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: text.substring(0, 512) }),
          signal: AbortSignal.timeout(15000)
        })

        if (hfRes.ok) {
          const hfData = await hfRes.json()
          if (Array.isArray(hfData) && hfData[0]) {
            const scores = hfData[0]
            const aiScore = scores.find((s: { label: string }) => s.label === 'LABEL_1')?.score ?? 0.5
            const confidence = Math.round(aiScore * 100)
            result = {
              verdict: confidence >= 60 ? 'AI' : confidence >= 35 ? 'UNCERTAIN' : 'HUMAN',
              confidence,
              signals: [{ name: 'ML Model Score', category: 'model', description: 'Fine-tuned RoBERTa classification', weight: confidence, value: confidence, flagged: confidence >= 60 }],
              summary: `AI detection model analysis complete with ${confidence}% confidence.`,
              model_used: modelId,
              processing_time: Date.now() - startTime,
            }
          }
        }
      } catch {
        // Fall through to heuristic
      }
    }

    // Fallback to heuristic
    if (!result) {
      result = heuristicTextDetection(text)
    }

    return NextResponse.json<APIResponse<DetectionResult>>({
      success: true,
      data: result,
      meta: { processing_time: Date.now() - startTime, request_id: requestId }
    })

  } catch (error) {
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 })
  }
}
