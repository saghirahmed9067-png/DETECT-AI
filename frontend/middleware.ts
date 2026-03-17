import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// Pre-build the Clerk handler (safe to create at module scope even without keys)
const _clerkHandler = clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname
  // Only admin API routes require authentication
  if (path.startsWith('/api/admin')) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.next()
})

/**
 * Wrapper middleware — guards against MIDDLEWARE_INVOCATION_FAILED.
 *
 * Clerk v7 throws `throwMissingPublishableKeyError` / `throwMissingSecretKeyError`
 * when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY are absent.
 * Without this guard every single page returns 500, crashing the entire site.
 *
 * Fix: if keys are not configured, bypass Clerk and allow the request through.
 * The site stays up; protected routes just won't enforce auth until keys are set.
 */
export default async function middleware(req: NextRequest, event: any) {
  const pubKey    = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!pubKey || !secretKey) {
    // Keys not configured — let request pass rather than crashing
    console.warn('[Middleware] Clerk keys missing — bypassing auth. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY in Vercel env.')
    return NextResponse.next()
  }

  try {
    return await _clerkHandler(req, event)
  } catch (err) {
    // Catch any unexpected Clerk runtime error — never crash the whole site
    console.error('[Middleware] Clerk invocation failed:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
