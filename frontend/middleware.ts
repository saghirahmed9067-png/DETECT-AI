import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/detect', '/scraper', '/batch', '/history', '/profile', '/settings', '/pipeline', '/chat']

// Lightweight JWT decode (no verification — verification happens in API routes)
// Middleware just checks token structure + expiry to avoid a full crypto round-trip on every request
function isTokenStructurallyValid(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub || !payload.exp) return false
    // Reject expired tokens
    if (Date.now() / 1000 > payload.exp) return false
    // Must be issued by Firebase for this project
    if (payload.iss !== 'https://securetoken.google.com/detectai-prod') return false
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Skip static assets and auth routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path.startsWith('/api/auth/') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  if (PROTECTED.some(p => path.startsWith(p))) {
    const token = req.cookies.get('__session')?.value

    if (!token || !isTokenStructurallyValid(token)) {
      // Clear invalid/expired cookie and redirect
      const loginUrl = new URL(`/login?returnTo=${encodeURIComponent(path)}`, req.url)
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete('__session')
      return res
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
}
