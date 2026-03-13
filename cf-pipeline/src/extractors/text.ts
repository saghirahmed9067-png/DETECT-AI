import type { Source, Extracted } from '../types'
import { sha256 } from '../utils/crypto'
import { qualityText } from '../utils/quality'

function extractText(row: Record<string, any>, fields: string[]): string | null {
  for (const f of fields) {
    const v = row[f]
    if (!v) continue
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (Array.isArray(v)) {
      const first = v[0]
      if (typeof first === 'string' && first.trim()) return first.trim()
      if (first && typeof first === 'object') {
        const c = first.content ?? first.text ?? first.value
        if (typeof c === 'string' && c.trim()) return c.trim()
      }
    }
    if (typeof v === 'object' && v !== null) {
      const c = v.text ?? v.content ?? v.value
      if (typeof c === 'string' && c.trim()) return c.trim()
    }
  }
  return null
}

export function extractLabel(row: Record<string, any>, src: Source): 'ai' | 'human' {
  if (src.label !== 'mixed') return src.label as 'ai' | 'human'
  if (!src.label_field || !src.label_map) return 'ai'
  const raw = row[src.label_field]
  if (raw == null) return 'ai'
  return src.label_map[String(raw)] ?? 'ai'
}

export async function extractTextRow(
  row: Record<string, any>,
  src: Source,
): Promise<Extracted | null> {
  const fields = src.text_fields ?? ['text', 'content', 'body', 'article', 'document']
  const text   = extractText(row, fields)
  if (!text || text.length < 80) return null

  const label   = extractLabel(row, src)
  const trimmed = text.slice(0, 5000)
  const quality = qualityText(trimmed)
  if (quality < 0.4) return null

  const hash = await sha256(trimmed.slice(0, 400))

  return {
    label,
    content_text:    trimmed.slice(0, 4000),
    content_preview: trimmed.slice(0, 250).replace(/\s+/g, ' '),
    content_hash:    hash,
    quality_score:   quality,
    word_count:      trimmed.split(/\s+/).length,
    char_count:      trimmed.length,
    sentence_count:  (trimmed.match(/[.!?]+\s/g) ?? []).length || 1,
    language:        src.language ?? 'en',
  }
}
