import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth0 } from '@/lib/auth0'

const PROTECTED = ['/dashboard', '/detect', '/scraper', '/batch', '/history', '/profile', '/settings', '/pipeline']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Let Auth0 handle its own routes
  if (path.startsWith('/api/auth')) {
    return auth0.middleware(req)
  }

  // Protect dashboard routes - check for session
  if (PROTECTED.some(p => path.startsWith(p))) {
    const session = await auth0.getSession()
    if (!session) {
      const loginUrl = new URL('/api/auth/login', req.url)
      loginUrl.searchParams.set('returnTo', path)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
}
