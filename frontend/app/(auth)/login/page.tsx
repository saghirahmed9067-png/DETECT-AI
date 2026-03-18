'use client'
import { useEffect } from 'react'
import { useClerk, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Zap, CheckCircle, Shield, Chrome } from 'lucide-react'

const PERKS = [
  'Save your complete scan history',
  'Access all 6 detection tools — unlimited',
  'Batch scan up to 20 files at once',
  'AI Detection Assistant chat',
  'Free forever — no credit card',
]

export default function LoginPage() {
  const { openSignIn } = useClerk()
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  // Auto-open sign-in modal on page load
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      openSignIn({ forceRedirectUrl: '/dashboard', fallbackRedirectUrl: '/dashboard' })
    }
  }, [isLoaded, isSignedIn]) // eslint-disable-line

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 z-10">
        {/* Logo */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5 justify-center">
            <Image src="/logo.png" alt="Aiscern" width={52} height={36}
              className="object-contain drop-shadow-[0_0_12px_rgba(245,100,0,0.5)]" priority />
            <span className="text-2xl font-black gradient-text">Aiscern</span>
          </Link>
          <h1 className="text-2xl font-black text-text-primary">Welcome back</h1>
          <p className="text-text-muted text-sm">Sign in to access your dashboard and scan history</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 space-y-5 shadow-2xl shadow-primary/10">
          <ul className="space-y-2.5">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <CheckCircle className="w-4 h-4 text-emerald flex-shrink-0" />{p}
              </li>
            ))}
          </ul>

          {/* Primary button — opens Clerk modal directly */}
          <button
            onClick={() => openSignIn({ forceRedirectUrl: '/dashboard', fallbackRedirectUrl: '/dashboard' })}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all active:scale-95"
          >
            <Zap className="w-4 h-4" />
            Sign In to Aiscern
          </button>

          {/* Google shortcut */}
          <button
            onClick={() => openSignIn({ forceRedirectUrl: '/dashboard', fallbackRedirectUrl: '/dashboard' })}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:bg-surface-hover transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-text-muted">
            No account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-semibold">
              Create one free →
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-text-disabled flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald" />
          Free forever · No credit card · 285,000+ training samples
        </p>
      </div>
    </div>
  )
}
