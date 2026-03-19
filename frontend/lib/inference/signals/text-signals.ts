/**
 * Aiscern — Advanced Text Signal Extractors
 * Pure deterministic algorithms. No ML required — fast, always available.
 *
 * Signals:
 *  1. Perplexity Proxy       – AI text is "too smooth" (low perplexity)
 *  2. Burstiness             – human writing has bursty rare words
 *  3. Type-Token Ratio       – vocabulary richness via MATTR
 *  4. Zipf Deviation         – AI word-freq deviates from power law
 *  5. Sentence Uniformity    – AI sentences are unnaturally similar in length
 *  6. AI Phrase Fingerprint  – LLM-specific overused phrases
 *  7. Punctuation Entropy    – AI punctuation is systematic, not idiosyncratic
 *  8. Hapax Ratio            – unique once-occurring words (higher in humans)
 */

export interface TextSignalResult {
  name:        string
  score:       number   // 0–1, higher = more AI-like
  weight:      number
  description: string
}

function perplexityProxy(text: string): number {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length < 20) return 0.5
  const bigrams = new Map<string, number>()
  for (let i = 0; i < words.length - 1; i++) {
    const bg = words[i] + ' ' + words[i + 1]
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1)
  }
  const repeated = [...bigrams.values()].filter(c => c > 1).length
  const predictability = repeated / Math.max(bigrams.size, 1)
  return Math.min(0.95, Math.max(0.05, predictability * 2.5))
}

function burstinessScore(text: string): number {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 4)
  if (words.length < 30) return 0.5
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  const repeated = [...freq.entries()].filter(([, c]) => c >= 2).map(([w]) => w)
  if (!repeated.length) return 0.3
  let totalCV = 0
  for (const word of repeated.slice(0, 15)) {
    const positions = words.reduce((acc, w, i) => { if (w === word) acc.push(i); return acc }, [] as number[])
    if (positions.length < 2) continue
    const gaps    = positions.slice(1).map((p, i) => p - positions[i])
    const mean    = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const variance= gaps.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / gaps.length
    totalCV      += Math.sqrt(variance) / Math.max(mean, 1)
  }
  const avgCV = totalCV / Math.max(repeated.length, 1)
  return Math.min(0.95, Math.max(0.05, 1 - Math.min(1, avgCV / 2)))
}

function typeTokenRatio(text: string): number {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length < 10) return 0.5
  const windowSize = Math.min(50, words.length)
  let totalTTR = 0; let windows = 0
  for (let i = 0; i <= words.length - windowSize; i += Math.max(1, Math.floor(windowSize / 4))) {
    const w = words.slice(i, i + windowSize)
    totalTTR += new Set(w).size / windowSize
    windows++
  }
  const mattr = totalTTR / Math.max(windows, 1)
  if (mattr >= 0.60 && mattr <= 0.78) return 0.65
  if (mattr > 0.78) return 0.25
  return 0.40
}

function zipfDeviation(text: string): number {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length < 50) return 0.5
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  const sorted = [...freq.values()].sort((a, b) => b - a)
  const C = sorted[0]
  let deviation = 0
  for (let i = 1; i <= Math.min(sorted.length, 20); i++) {
    deviation += Math.abs(sorted[i - 1] - C / i) / Math.max(C / i, 1)
  }
  return Math.min(0.95, Math.max(0.05, Math.min(1, (deviation / Math.min(sorted.length, 20)) * 1.5)))
}

function sentenceUniformity(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length >= 4)
  if (sentences.length < 3) return 0.5
  const lengths = sentences.map(s => s.trim().split(/\s+/).length)
  const mean    = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance= lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length
  const cv      = Math.sqrt(variance) / Math.max(mean, 1)
  if (cv < 0.20) return 0.82
  if (cv < 0.30) return 0.65
  if (cv < 0.40) return 0.45
  return 0.25
}

const AI_PHRASES = [
  'additionally','furthermore','moreover','consequently','nevertheless',
  'in conclusion','to summarize','in summary','it is worth noting',
  'it is important to note','it is crucial','it is essential',
  'as an ai','as a language model','as an artificial intelligence',
  'multifaceted','nuanced','comprehensive','leverage','paradigm',
  'in the realm of','delve into','dive into','tapestry','landscape',
  'navigate','foster','pivotal','crucial','vital','certainly!',
  'absolutely!','great question','excellent question','with that said',
  'having said that','that being said','needless to say',
]

function aiPhraseFingerprint(text: string): number {
  const lower = text.toLowerCase()
  const wordCount = Math.max(text.split(/\s+/).length, 1)
  const hits = AI_PHRASES.filter(p => lower.includes(p)).length
  return Math.min(0.95, Math.max(0.05, Math.min(1, (hits / (wordCount / 100)) * 0.35)))
}

function hapaxRatio(text: string): number {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3)
  if (words.length < 30) return 0.5
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  const hapax = [...freq.values()].filter(c => c === 1).length / Math.max(freq.size, 1)
  if (hapax > 0.75) return 0.20
  if (hapax > 0.60) return 0.35
  if (hapax > 0.45) return 0.55
  return 0.75
}

export function extractTextSignals(text: string): TextSignalResult[] {
  return [
    { name: 'Sentence Uniformity',     score: sentenceUniformity(text),    weight: 0.22, description: 'AI sentences are unnaturally similar in length; humans vary much more' },
    { name: 'AI Phrase Fingerprint',   score: aiPhraseFingerprint(text),   weight: 0.22, description: 'LLMs overuse specific transitional phrases ("Furthermore", "Delve into")' },
    { name: 'Perplexity Proxy',        score: perplexityProxy(text),       weight: 0.14, description: 'AI text reuses predictable word pairs; human writing is less formulaic' },
    { name: 'Burstiness',              score: burstinessScore(text),       weight: 0.12, description: 'Human writers use key words in local bursts; AI distributes evenly' },
    { name: "Zipf's Law Deviation",    score: zipfDeviation(text),         weight: 0.12, description: "Natural language follows Zipf's power law; AI produces flatter distributions" },
    { name: 'Vocabulary Richness',     score: typeTokenRatio(text),        weight: 0.10, description: 'AI hits a mechanical sweetspot of variety; humans are less systematic' },
    { name: 'Hapax Legomena Ratio',    score: hapaxRatio(text),            weight: 0.08, description: 'Human writers use more unique once-occurring words than AI systems' },
  ]
}

export function aggregateTextSignals(signals: TextSignalResult[]): number {
  const totalW = signals.reduce((s, sig) => s + sig.weight, 0)
  return signals.reduce((s, sig) => s + sig.score * sig.weight, 0) / totalW
}
