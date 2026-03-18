import { NextRequest, NextResponse } from 'next/server'

export interface CreditGuardResult {
  userId:           string
  creditsRemaining: number
  unlimited?:       boolean
}

export class HTTPError extends Error {
  constructor(public status: number, message: string, public body?: object) {
    super(message)
  }
}

/**
 * OPEN SOURCE MODE — all scans are free and unlimited.
 * creditGuard simply identifies the user (or uses IP for anon) and
 * always returns unlimited credits. No plan checks, no Stripe, no blocks.
 */
export async function creditGuard(req: NextRequest, _scanType: string): Promise<CreditGuardResult> {
  // Try to read Clerk session cookie for user ID (optional)
  const token = req.cookies.get('__session')?.value
  if (token) {
    try {
      const parts   = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
      if (payload.sub && Date.now() / 1000 <= payload.exp) {
        return { userId: payload.sub, creditsRemaining: 999999, unlimited: true }
      }
    } catch { /* invalid session — fall through to anon */ }
  }
  // Anonymous: track by IP, no limits
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous'
  return { userId: `anon_${ip}`, creditsRemaining: 999999, unlimited: true }
}

export function httpErrorResponse(err: HTTPError): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: 'ERROR', message: err.message, ...err.body } },
    { status: err.status }
  )
}
