/**
 * Quality scoring functions — per modality, returns 0.0–1.0
 */

export function qualityText(text: string): number {
  const words = text.split(/\s+/).length
  let s = 0.4
  if (text.length > 200)  s += 0.1
  if (text.length > 1000) s += 0.1
  if (words > 30)         s += 0.1
  if (words > 150)        s += 0.1
  if (text.length > 8000) s -= 0.1
  return Math.min(0.98, Math.max(0, s))
}

export function qualityAudio(durationSeconds?: number, sampleRate?: number): number {
  let s = 0.6
  if (durationSeconds && durationSeconds >= 1)  s += 0.10
  if (durationSeconds && durationSeconds >= 5)  s += 0.10
  if (durationSeconds && durationSeconds >= 30) s += 0.05
  if (sampleRate     && sampleRate >= 16000)    s += 0.05
  return Math.min(0.98, s)
}

export function qualityImage(width?: number, height?: number): number {
  let s = 0.6
  if (width && height) {
    const px = width * height
    if (px > 50_000)  s += 0.10
    if (px > 250_000) s += 0.10
    if (px > 500_000) s += 0.10
  }
  return Math.min(0.98, s)
}

export function qualityVideo(url?: string, durationSeconds?: number): number {
  let s = 0.65
  if (url)            s += 0.10
  if (durationSeconds) s += 0.10
  s += Math.random() * 0.05  // slight jitter
  return Math.min(0.98, s)
}
