import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/detect', '/scraper', '/batch', '/history', '/profile', '/settings', '/pipeline']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path === '/favicon.ico' ||
    path.startsWith('/api/auth/')
  ) {
    return NextResponse.next()
  }

  if (PROTECTED.some(p => path.startsWith(p))) {
    const token = req.cookies.get('__session')?.value
    if (!token) {
      const loginUrl = new URL(`/login?returnTo=${encodeURIComponent(path)}`, req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
}
