/**
 * HuggingFace Datasets Server API client
 * Fetches rows from public HF datasets with exponential backoff retry.
 */

const HF_DATASETS_API = 'https://datasets-server.huggingface.co'

/** Exponential backoff retry wrapper */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseMs = 500,
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      if (attempt < maxAttempts) {
        const delay = baseMs * Math.pow(2, attempt - 1) + Math.random() * 200
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

export interface HFRow {
  row_idx: number
  row:     Record<string, any>
}

export interface HFRowsResponse {
  rows: HFRow[]
}

/** Fetch rows from HuggingFace Datasets Server API */
export async function fetchHFRows(
  dataset:  string,
  config  = 'default',
  split   = 'train',
  offset  = 0,
  length  = 100,
  hfToken?: string,
): Promise<HFRowsResponse> {
  const url = [
    `${HF_DATASETS_API}/rows`,
    `?dataset=${encodeURIComponent(dataset)}`,
    `&config=${encodeURIComponent(config)}`,
    `&split=${encodeURIComponent(split)}`,
    `&offset=${offset}`,
    `&length=${length}`,
  ].join('')

  const headers: Record<string, string> = {
    'User-Agent': 'DETECTAI-Pipeline/6.0',
  }
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`

  return withRetry(async () => {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(20_000),
    })

    if (res.status === 429) {
      const retry = res.headers.get('Retry-After')
      const wait  = retry ? parseInt(retry) * 1000 : 5000
      await new Promise(r => setTimeout(r, wait))
      throw new Error(`Rate limited on ${dataset}`)
    }

    if (!res.ok) {
      throw new Error(`HF API ${res.status} for ${dataset}: ${await res.text().catch(() => '')}`)
    }

    return res.json() as Promise<HFRowsResponse>
  })
}
