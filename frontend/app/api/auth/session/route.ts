import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { idToken } = body

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Basic structural check before setting cookie
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Malformed token' }, { status: 401 })
    }

    // If Firebase Admin SDK is available, verify cryptographically
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const { adminAuth } = await import('@/lib/firebase/admin')
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(idToken, true /* checkRevoked */)
          if (!decoded.uid) {
            return NextResponse.json({ error: 'Invalid token: no uid' }, { status: 401 })
          }
        }
      } catch (verifyErr: any) {
        // BUG-006 fix: reject on verification failure — never skip
        console.error('[session] Token verification failed:', verifyErr?.code || 'unknown')
        return NextResponse.json(
          { error: 'Token verification failed', code: verifyErr?.code },
          { status: 401 }
        )
      }
    } else {
      // Without Admin SDK: verify token structure + project claim
      try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload.iss !== 'https://securetoken.google.com/detectai-prod') {
          return NextResponse.json({ error: 'Token from wrong project' }, { status: 401 })
        }
        if (!payload.sub || !payload.exp || Date.now() / 1000 > payload.exp) {
          return NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 })
        }
      } catch {
        return NextResponse.json({ error: 'Malformed token payload' }, { status: 401 })
      }
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set('__session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',   // BUG-007: strict prevents CSRF
      maxAge: 60 * 60 * 24 * 14,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[session] POST error:', err)
    return NextResponse.json({ error: 'Session error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('__session', '', { maxAge: 0, path: '/' })
  return res
}

export async function GET() {
  return NextResponse.json({ ok: true, timestamp: Date.now() })
}
