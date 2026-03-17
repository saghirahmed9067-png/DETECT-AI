import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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
 * Open-access mode: allows anonymous scans tracked by IP.
 * Signed-in users get higher limits and scan history saved.
 */
export async function creditGuard(req: NextRequest, scanType: string): Promise<CreditGuardResult> {
  // Try to get Clerk session (optional — not required)
  const token = req.cookies.get('__session')?.value
  
  if (token) {
    // Signed-in user path
    try {
      const parts   = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
      if (payload.sub && Date.now() / 1000 <= payload.exp) {
        const userId = payload.sub
        // Pro users: unlimited
        const db = getSupabaseAdmin()
        const { data: profile } = await db
          .from('profiles')
          .select('plan, scan_credits')
          .eq('id', userId)
          .single()
        
        if (profile?.plan === 'pro' || profile?.plan === 'enterprise') {
          return { userId, creditsRemaining: 999999, unlimited: true }
        }
        // Free signed-in user: higher limits, save history
        return { userId, creditsRemaining: profile?.scan_credits ?? 100 }
      }
    } catch {
      // Session invalid — fall through to anonymous
    }
  }

  // Anonymous / open access: use IP as userId, no DB write
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous'
  return { userId: `anon_${ip}`, creditsRemaining: 999, unlimited: true }
}

export function httpErrorResponse(err: HTTPError): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: 'ERROR', message: err.message, ...err.body } },
    { status: err.status }
  )
}
