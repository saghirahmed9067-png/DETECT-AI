import type { Source, Extracted } from '../types'
import { sha256 } from '../utils/crypto'
import { qualityVideo } from '../utils/quality'
import { extractLabel } from './text'

export async function extractVideoRow(
  row:    Record<string, any>,
  src:    Source,
  rowIdx: number,
): Promise<Extracted | null> {
  const label = extractLabel(row, src)
  let url: string | undefined
  let dur: number | undefined
  let w: number | undefined
  let h: number | undefined

  if (src.url_field && typeof row[src.url_field] === 'string') {
    url = row[src.url_field]
  }
  if (!url) {
    for (const f of ['video_url', 'url', 'path', 'video_path', 'file']) {
      if (typeof row[f] === 'string') { url = row[f]; break }
    }
  }

  const meta: Record<string, any> = {}
  for (const f of (src.meta_fields ?? [])) {
    if (row[f] != null) {
      meta[f] = row[f]
      if (f === 'duration')  dur = Number(row[f])
      if (f === 'width')     w   = Number(row[f])
      if (f === 'height')    h   = Number(row[f])
      if (f === 'end_time' && meta['start_time']) {
        dur = Number(row[f]) - Number(meta['start_time'])
      }
    }
  }

  // Reject rows with no usable URL — avoids inserting empty/garbage rows
  if (!url) return null

  return {
    label,
    content_url:      url,
    content_preview:  `[Video from ${src.name}]${url ? ` — ${url.slice(0, 120)}` : ''}`,
    content_hash:     await sha256(`${src.name}:video:${rowIdx}:${url ?? ''}`),
    quality_score:    qualityVideo(url, dur),
    duration_seconds: dur,
    resolution_w:     w,
    resolution_h:     h,
    has_face:         /face|celeb|deepfake/i.test(src.name),
    language:         src.language ?? 'en',
    metadata:         Object.keys(meta).length ? meta : undefined,
  }
}
