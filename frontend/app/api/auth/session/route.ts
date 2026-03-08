import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()
    
    // Verify token server-side if adminAuth available
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const { adminAuth } = await import('@/lib/firebase/admin')
      if (adminAuth) {
        await adminAuth.verifyIdToken(idToken)
      }
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set('__session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return res
  } catch (err) {
    console.error('Session error:', err)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('__session')
  return res
}
