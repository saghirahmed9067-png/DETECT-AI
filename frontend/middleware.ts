import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = createRouteMatcher([
  '/dashboard(.*)',
  '/batch(.*)',
  '/history(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/chat(.*)',
  '/scraper(.*)',
  '/pipeline(.*)',
  '/api/admin(.*)',
])

const pubKey    = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
const secretKey = process.env.CLERK_SECRET_KEY || ''
const hasClerk  = pubKey.startsWith('pk_') && secretKey.startsWith('sk_')

// If Clerk keys are not configured, fall back to simple redirect
function fallbackMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const protectedPaths = ['/dashboard','/batch','/history','/profile','/settings','/chat','/scraper','/pipeline','/api/admin']
  if (protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (PROTECTED(req)) {
        const { userId } = await auth()
        if (!userId) {
          const url = new URL('/login', req.url)
          url.searchParams.set('redirect_url', req.nextUrl.pathname)
          return NextResponse.redirect(url)
        }
      }
    })
  : fallbackMiddleware

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|map)).*)',
  ],
}
