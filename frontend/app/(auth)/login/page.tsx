'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

function LoginContent() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [redirecting, setRedirecting] = useState(false)

  const redirectUrl = searchParams.get('redirect_url') || '/dashboard'

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setRedirecting(true)
      router.replace(redirectUrl)
    }
  }, [isLoaded, isSignedIn, router, redirectUrl])

  if (redirecting) {
    return (
      <div className="min-h-screen bg-[#06060e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-sm text-[#5a647a]">Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-violet-600/[0.07] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-indigo-600/[0.05] blur-[120px] pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-6 relative z-10 group">
        <Image src="/logo.png" alt="Aiscern logo" width={38} height={26}
          className="object-contain drop-shadow-[0_0_12px_rgba(245,100,0,0.55)] group-hover:drop-shadow-[0_0_16px_rgba(245,100,0,0.7)] transition-all" priority />
        <span className="text-xl font-black gradient-text">Aiscern</span>
      </Link>

      {/* Custom header — replaces Clerk's "Sign in to DETECT-AI" */}
      <div className="relative z-10 w-full max-w-[420px] mb-0">
        <div className="bg-[#0d0d1f] border border-[#1e1e3a] border-b-0 rounded-t-2xl px-7 pt-7 pb-4">
          <h1 className="text-white font-bold text-[22px] tracking-tight leading-tight">Welcome back</h1>
          <p className="text-[#8892a4] text-[13px] mt-1">Sign in to your Aiscern account</p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <SignIn
          routing="path"
          path="/login"
          forceRedirectUrl={redirectUrl}
          fallbackRedirectUrl="/dashboard"
          signUpUrl="/signup"
          appearance={{
            layout: {
              socialButtonsPlacement: 'bottom',
              socialButtonsVariant: 'blockButton',
              showOptionalFields: false,
            },
            variables: {
              colorPrimary:                 '#7c3aed',
              colorBackground:              '#0d0d1f',
              colorInputBackground:         '#12122a',
              colorInputText:               '#f0f4ff',
              colorText:                    '#eef2ff',
              colorTextSecondary:           '#a0aec0',
              colorTextOnPrimaryBackground: '#ffffff',
              colorNeutral:                 '#2a2a4a',
              colorDanger:                  '#f87171',
              colorSuccess:                 '#34d399',
              colorWarning:                 '#fbbf24',
              borderRadius:                 '0px',
              fontFamily:                   'inherit',
              fontSize:                     '14px',
              spacingUnit:                  '16px',
              fontWeight: { normal: 400, medium: 500, bold: 700 },
            },
            elements: {
              // ── Card shell — no top radius (we have custom header above) ────
              rootBox:   'w-full',
              card:      'bg-[#0d0d1f] border border-[#1e1e3a] border-t-0 shadow-[0_24px_64px_rgba(0,0,0,0.6)] rounded-b-2xl overflow-hidden p-0',
              cardBox:   'rounded-b-2xl',

              // ── HIDE the Clerk branded header (shows "Sign in to DETECT-AI") ─
              header:    '!hidden',

              // ── Main form area ────────────────────────────────────────────────
              main: 'px-7 pb-2 pt-5',

              // ── Form fields ───────────────────────────────────────────────────
              formFieldRow:      'mb-4',
              formFieldLabelRow: 'flex items-center justify-between mb-1.5',
              // Raised from #5a6480 to #8a94b0 — much more visible on dark bg
              formFieldLabel:    'text-[12px] font-semibold tracking-[0.06em] uppercase text-[#8a94b0]',
              formFieldHintText: 'text-[#8a94b0] text-[12px] mt-1',
              formFieldInput: [
                'w-full bg-[#12122a] border border-[#1e1e3a] text-[#eef2ff]',
                'placeholder:text-[#4a4e70] rounded-[10px] text-[14px] px-3.5 py-2.5',
                'transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 focus:bg-[#14143a]',
                'hover:border-[#2a2a55]',
              ].join(' '),
              formFieldInputShowPasswordButton: 'text-[#5a6480] hover:text-[#9aa3ba] transition-colors pr-1',
              formFieldAction:      'text-violet-400 hover:text-violet-300 text-[12px] font-medium transition-colors',
              // Error / warning / success text — fully visible now
              formFieldErrorText:   'text-rose-400 text-[13px] mt-1.5 font-medium',
              formFieldSuccessText: 'text-emerald-400 text-[13px] mt-1.5 font-medium',
              formFieldWarningText: 'text-amber-400 text-[13px] mt-1.5 font-medium',

              // ── OTP inputs ───────────────────────────────────────────────────
              otpCodeFieldInput: [
                'bg-[#12122a] border border-[#1e1e3a] text-white font-mono text-[18px] font-semibold',
                'rounded-[10px] text-center w-11 h-12',
                'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500',
                'transition-all duration-150',
              ].join(' '),

              // ── Primary button ────────────────────────────────────────────────
              formButtonPrimary: [
                'w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700',
                'text-white font-semibold text-[14px] rounded-[10px] py-2.5',
                'shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.5)]',
                'transition-all duration-200 border-0',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              ].join(' '),

              formButtonReset: 'text-violet-400 hover:text-violet-300 text-[13px] font-medium transition-colors',

              // ── Divider ───────────────────────────────────────────────────────
              dividerRow:  'my-5',
              dividerLine: 'bg-[#1e1e3a]',
              dividerText: 'text-[#6b7a99] text-[11px] px-3 uppercase tracking-widest',

              // ── Social buttons ────────────────────────────────────────────────
              socialButtonsBlockButton: [
                'w-full bg-[#10102a] border border-[#1e1e3a] text-[#94a3b8] rounded-[10px]',
                'hover:bg-[#15153a] hover:border-[#2e2e5a] hover:text-[#c4cce0]',
                'transition-all duration-200 py-2.5',
              ].join(' '),
              socialButtonsBlockButtonText:  'text-[13px] font-medium',
              socialButtonsBlockButtonArrow: 'hidden',
              socialButtonsProviderIcon:     'w-4 h-4',

              // ── Alert banner ──────────────────────────────────────────────────
              alert: [
                'bg-rose-500/10 border border-rose-500/25 rounded-[10px]',
                'text-rose-300 text-[13px] px-4 py-3 my-4',
              ].join(' '),
              alertText:        'text-rose-300 leading-relaxed',
              alertTextDanger:  'text-rose-300',
              alertTextWarning: 'text-amber-300',

              // ── Footer ────────────────────────────────────────────────────────
              footer:           'px-7 pt-3 pb-6',
              footerAction:     'text-center',
              footerActionText: 'text-[#6b7a99] text-[13px]',
              footerActionLink: 'text-violet-400 hover:text-violet-300 font-semibold text-[13px] transition-colors ml-1',
              footerPages:      '!hidden',

              // ── Identity preview ──────────────────────────────────────────────
              identityPreviewText:       'text-[#c4cce0] text-[14px]',
              identityPreviewEditButton: 'text-violet-400 hover:text-violet-300 text-[13px] transition-colors',

              spinner: 'text-violet-400',

              alternativeMethodsBlockButton: [
                'w-full bg-[#10102a] border border-[#1e1e3a] text-[#94a3b8] rounded-[10px]',
                'hover:bg-[#15153a] hover:text-[#c4cce0] transition-all duration-200 py-2.5 text-[13px]',
              ].join(' '),
            },
          }}
        />
      </div>

      <p className="mt-5 text-[11px] text-[#2a2e45] relative z-10">© 2026 Aiscern · Secured by Clerk</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06060e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
