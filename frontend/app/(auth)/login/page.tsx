'use client'
import { useEffect } from 'react'
import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

const PERKS = [
  'Detect ChatGPT, Claude & Gemini text',
  'Deepfake image & video detection',
  'AI voice clone detection',
  'Save unlimited scan history',
  'Batch scan 20 files at once',
]

const AVATARS = ['#7c3aed','#2563eb','#10b981','#f59e0b','#ef4444']

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen bg-[#07070f] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-12 bg-[#0d0d1f] border-r border-white/5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-[100px] pointer-events-none" />

        <Link href="/" className="flex items-center gap-3 relative z-10">
          <Image src="/logo.png" alt="Aiscern" width={48} height={32}
            className="object-contain drop-shadow-[0_0_10px_rgba(245,100,0,0.5)]" priority />
          <span className="text-2xl font-black gradient-text">Aiscern</span>
        </Link>

        <div className="space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-text-muted font-medium">Free forever</span>
          </div>

          <div>
            <h1 className="text-4xl font-black text-text-primary leading-tight mb-2">
              The world&apos;s most accurate
            </h1>
            <h2 className="text-4xl font-black text-primary leading-tight">AI detector</h2>
          </div>

          <ul className="space-y-3">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-3 text-text-secondary text-sm">
                <CheckCircle className="w-4 h-4 text-emerald flex-shrink-0" />{p}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <div className="flex">
              {AVATARS.map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0d0d1f] flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: c, marginLeft: i > 0 ? '-8px' : 0, zIndex: 5 - i }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span className="text-sm text-text-muted">
              <strong className="text-text-primary">5,000+</strong> users trust Aiscern
            </span>
          </div>
        </div>

        <p className="text-xs text-text-disabled relative z-10">© 2025 Aiscern · Free AI Detection</p>
      </div>

      {/* Right panel — Clerk SignIn embedded */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <Link href="/" className="flex lg:hidden items-center gap-2 mb-8">
          <Image src="/logo.png" alt="Aiscern" width={36} height={24} className="object-contain" priority />
          <span className="text-xl font-black gradient-text">Aiscern</span>
        </Link>

        <div className="w-full max-w-[400px]">
          <SignIn
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/signup"
            appearance={{
              variables: {
                colorPrimary: '#7c3aed',
                colorBackground: '#0d0d1f',
                colorInputBackground: '#12122a',
                colorInputText: '#e2e8f0',
                colorText: '#e2e8f0',
                colorTextSecondary: '#94a3b8',
                borderRadius: '0.75rem',
                fontFamily: 'inherit',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-[#0d0d1f] border border-white/10 shadow-2xl shadow-primary/10 rounded-2xl',
                headerTitle: 'text-text-primary font-black text-2xl',
                headerSubtitle: 'text-text-muted',
                socialButtonsBlockButton: 'bg-white/5 border border-white/10 text-text-primary hover:bg-white/10 transition-all',
                formFieldInput: 'bg-[#12122a] border-white/10 text-text-primary focus:border-primary',
                formButtonPrimary: 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30',
                footerActionLink: 'text-primary hover:text-primary/80',
                identityPreviewText: 'text-text-primary',
                formFieldLabel: 'text-text-secondary',
                dividerLine: 'bg-white/10',
                dividerText: 'text-text-disabled',
              }
            }}
          />
        </div>

        <p className="mt-6 text-xs text-text-disabled text-center">
          No account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up free →
          </Link>
        </p>
      </div>
    </div>
  )
}
