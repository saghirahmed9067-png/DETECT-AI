/**
 * HuggingFace Datasets Server API client
 * v7: sequential cursor-aware fetching with parallel page support
 */

const HF_DATASETS_API = 'https://datasets-server.huggingface.co'
const MAX_HF_LENGTH   = 100  // HF API max rows per request

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseMs = 1000): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn() }
    catch (err: any) {
      lastError = err
      if (attempt < maxAttempts) {
        const delay = baseMs * attempt + Math.random() * 100
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

export interface HFRow { row_idx: number; row: Record<string, any> }
export interface HFRowsResponse { rows: HFRow[] }

function buildUrl(dataset: string, config: string, split: string, offset: number, length: number): string {
  return `${HF_DATASETS_API}/rows?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=${length}`
}

export async function fetchHFRows(
  dataset:  string,
  config  = 'default',
  split   = 'train',
  offset  = 0,
  length  = MAX_HF_LENGTH,
  hfToken?: string,
): Promise<HFRowsResponse> {
  const headers: Record<string, string> = { 'User-Agent': 'Aiscern-Pipeline/7.0' }
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`

  return withRetry(async () => {
    let url = buildUrl(dataset, config, split, offset, Math.min(length, MAX_HF_LENGTH))
    let res = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) })

    // Offset beyond dataset end — wrap to start
    if ((res.status === 400 || res.status === 416) && offset > 0) {
      url = buildUrl(dataset, config, split, 0, Math.min(length, MAX_HF_LENGTH))
      res = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) })
    }
    if (res.status === 429) {
      const wait = parseInt(res.headers.get('Retry-After') ?? '5') * 1000
      await new Promise(r => setTimeout(r, wait))
      throw new Error(`Rate limited: ${dataset}`)
    }
    if (res.status === 401 || res.status === 403)
      throw new Error(`GATED:${res.status} — ${dataset}`)
    if (!res.ok)
      throw new Error(`HF ${res.status} for ${dataset}: ${(await res.text().catch(() => '')).slice(0, 100)}`)

    return res.json() as Promise<HFRowsResponse>
  })
}
