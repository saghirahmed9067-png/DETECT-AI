/**
 * Aiscern — Advanced Text Signal Extractors v2
 * Pure deterministic algorithms. No ML required — fast, always available.
 *
 * Signals (8 total):
 *  1. Perplexity Proxy        – AI text is "too smooth" (bigram + trigram predictability)
 *  2. Burstiness              – human writing has bursty rare words
 *  3. Type-Token Ratio        – vocabulary richness via MATTR
 *  4. Zipf Deviation          – AI word-freq deviates from power law
 *  5. Sentence Uniformity     – AI sentences are unnaturally similar in length
 *  6. AI Phrase Fingerprint   – LLM-specific overused phrases (Claude/Gemini/LLaMA3 patterns)
 *  7. Hapax Legomena Ratio    – unique once-occurring words (higher in humans)
 *  8. Syntactic Uniformity    – AI produces parallel sentence-starter patterns
 */

export interface TextSignalResult {
  name:        string
  score:       number   // 0–1, higher = more AI-like
  weight:      number
  description: string
}

/**
 * Perplexity Proxy — upgraded to bigram + trigram combined.
 * Bigrams catch direct repetition; trigrams catch humanizer-shuffled AI patterns.
 */
function perplexityProxy(text: string): number {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length < 20) return 0.5

  const ngrams = new Map<string, number>()

  // Bigrams (2-word sequences)
  for (let i = 0; i < words.length - 1; i++) {
    const bg = words[i] + ' ' + words[i + 1]
    ngrams.set(bg, (ngrams.get(bg) ?? 0) + 1)
  }
  // Trigrams (3-word sequences) — weighted less, catches humanized AI
  for (let i = 0; i < words.length - 2; i++) {
    const tg = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]
    ngrams.set(tg, (ngrams.get(tg) ?? 0) + 1)
  }

  const repeated      = [...ngrams.values()].filter(c => c > 1).length
  const predictability = repeated / Math.max(ngrams.size, 1)
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

/**
 * AI Phrase Fingerprint — expanded to cover Claude, Gemini, LLaMA3 patterns.
 * Classic GPT phrases + modern LLM-specific isms.
 */
const AI_PHRASES = [
  // Classic GPT/generic LLM
  'additionally', 'furthermore', 'moreover', 'consequently', 'nevertheless',
  'in conclusion', 'to summarize', 'in summary', 'it is worth noting',
  'it is important to note', 'it is crucial', 'it is essential',
  'as an ai', 'as a language model', 'as an artificial intelligence',
  'multifaceted', 'nuanced', 'comprehensive', 'leverage', 'paradigm',
  'in the realm of', 'delve into', 'dive into', 'tapestry', 'landscape',
  'navigate', 'foster', 'pivotal', 'crucial', 'vital',
  'with that said', 'having said that', 'that being said', 'needless to say',

  // Claude-specific patterns
  "i'd be happy to", "here's a breakdown", 'let me walk you through',
  "it's worth noting", "it's important to note", "i'd like to emphasize",
  'to summarize', 'this is a nuanced', 'at its core',
  "let's explore", 'in other words', 'fundamentally speaking',
  'allow me to', 'i can help you', 'happy to assist',

  // Gemini/Google patterns
  'certainly!', 'absolutely!', 'great question', 'of course!',
  "you're right that", 'i understand your', 'i appreciate your',
  'to put it simply', 'building upon that', 'as we discussed',
  'excellent question', 'that is a great', 'i can see that',

  // LLaMA3/Meta patterns
  'my training data', 'based on my training', 'i cannot and will not',
  "i'm unable to assist", 'based on the information', 'as of my knowledge',
  'i was trained', 'my knowledge cutoff',
]

function aiPhraseFingerprint(text: string): number {
  const lower     = text.toLowerCase()
  const wordCount = Math.max(text.split(/\s+/).length, 1)
  const hits      = AI_PHRASES.filter(p => lower.includes(p)).length
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

/**
 * Syntactic Uniformity — NEW signal.
 * AI models produce syntactically parallel sentences at unnatural rates.
 * Measure: what % of sentences share the same 2-word opening pattern?
 * > 25% of sentences starting identically = strong AI indicator.
 */
function syntacticUniformity(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 5)

  if (sentences.length < 5) return 0.5

  const starters = sentences.map(s => {
    const words = s.toLowerCase().split(/\s+/).slice(0, 2)
    return words.join(' ')
  })

  const freq = new Map<string, number>()
  for (const s of starters) freq.set(s, (freq.get(s) ?? 0) + 1)

  const maxFreq   = Math.max(...freq.values())
  const uniformity = maxFreq / sentences.length

  // > 0.25 of sentences sharing the same opener = suspicious AI parallelism
  return Math.min(0.95, Math.max(0.05, uniformity * 3))
}

export function extractTextSignals(text: string): TextSignalResult[] {
  return [
    // Weights proportionally adjusted to sum to 1.0 with new 8th signal
    { name: 'Sentence Uniformity',     score: sentenceUniformity(text),    weight: 0.20, description: 'AI sentences are unnaturally similar in length; humans vary much more' },
    { name: 'AI Phrase Fingerprint',   score: aiPhraseFingerprint(text),   weight: 0.20, description: 'LLMs overuse specific transitional phrases — covers GPT, Claude, Gemini, LLaMA3 patterns' },
    { name: 'Perplexity Proxy',        score: perplexityProxy(text),       weight: 0.13, description: 'AI text reuses predictable word sequences (bigram + trigram analysis); humanized AI caught by trigrams' },
    { name: 'Burstiness',              score: burstinessScore(text),       weight: 0.11, description: 'Human writers use key words in local bursts; AI distributes evenly' },
    { name: "Zipf's Law Deviation",    score: zipfDeviation(text),         weight: 0.11, description: "Natural language follows Zipf's power law; AI produces flatter frequency distributions" },
    { name: 'Vocabulary Richness',     score: typeTokenRatio(text),        weight: 0.09, description: 'AI hits a mechanical sweetspot of variety; humans are less systematic' },
    { name: 'Hapax Legomena Ratio',    score: hapaxRatio(text),            weight: 0.08, description: 'Human writers use more unique once-occurring words than AI systems' },
    { name: 'Syntactic Uniformity',    score: syntacticUniformity(text),   weight: 0.08, description: 'AI produces syntactically parallel sentence openers at unnatural rates; humans vary structure more' },
  ]
}

export function aggregateTextSignals(signals: TextSignalResult[]): number {
  const totalW = signals.reduce((s, sig) => s + sig.weight, 0)
  return signals.reduce((s, sig) => s + sig.score * sig.weight, 0) / totalW
}
