'use client'
import { useEffect } from 'react'
import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Shield, Zap, Eye, Lock } from 'lucide-react'

const FEATURES = [
  { icon: Shield, text: 'Private & encrypted scans' },
  { icon: Zap,    text: 'Multi-model ensemble detection' },
  { icon: Eye,    text: 'Text · Images · Audio · Video' },
  { icon: Lock,   text: 'Free forever · No credit card' },
]

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#05050f]">

      {/* ── LEFT PANEL — brand/illustration (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-gradient-to-br from-[#0d0d22] to-[#080814]">
        {/* Ambient glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-orange-500/8 blur-[100px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <Image src="/logo.png" alt="Aiscern" width={44} height={30}
              className="object-contain drop-shadow-[0_0_16px_rgba(245,100,0,0.6)] group-hover:drop-shadow-[0_0_24px_rgba(245,100,0,0.8)] transition-all" priority />
            <span className="text-2xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Aiscern
            </span>
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col gap-8">
          {/* Big headline */}
          <div>
            <h1 className="text-4xl xl:text-5xl font-black leading-tight text-white mb-4">
              Detect AI content<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                with confidence
              </span>
            </h1>
            <p className="text-base text-slate-400 leading-relaxed max-w-sm">
              The most accurate free AI detector for text, images, audio and video. Powered by a 6-model ensemble.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm text-slate-300 font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            {[['413k+','Training samples'],['4','Detection modes'],['Free','Forever']].map(([val,lbl])=>(
              <div key={lbl}>
                <div className="text-2xl font-black text-white">{val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-600">
          © 2026 Aiscern · AI Content Detection Platform
        </div>
      </div>

      {/* ── RIGHT PANEL — auth form ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen lg:min-h-0 p-5 sm:p-8 relative">
        {/* Mobile ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-violet-600/6 blur-[80px] pointer-events-none lg:hidden" />

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Aiscern" width={40} height={27}
              className="object-contain drop-shadow-[0_0_12px_rgba(245,100,0,0.55)]" priority />
            <span className="text-xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Aiscern
            </span>
          </Link>
          <p className="text-sm text-slate-500">AI Content Detection</p>
        </div>

        {/* Form container */}
        <div className="w-full max-w-[400px] xl:max-w-[420px] relative z-10">
          {/* Header above clerk form */}
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">Welcome back</h2>
            <p className="text-sm text-slate-400">Sign in to your Aiscern account</p>
          </div>

          <SignIn
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/signup"
            appearance={{
              layout: {
                socialButtonsPlacement: 'bottom',
                socialButtonsVariant: 'blockButton',
                showOptionalFields: false,
              },
              variables: {
                colorPrimary: '#7c3aed',
                colorBackground: '#0e0e20',
                colorInputBackground: '#14142a',
                colorInputText: '#f0f4ff',
                colorText: '#eef2ff',
                colorTextSecondary: '#7a84a0',
                colorTextOnPrimaryBackground: '#ffffff',
                colorNeutral: '#2d3748',
                colorDanger: '#fc8181',
                borderRadius: '14px',
                fontFamily: 'inherit',
                fontSize: '14px',
                spacingUnit: '16px',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-[#0e0e20] border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_24px_48px_rgba(0,0,0,0.6)] rounded-2xl',
                cardBox: 'rounded-2xl overflow-hidden',
                header: 'hidden',
                main: 'px-0',
                formFieldRow: 'mb-0.5',
                formFieldLabel: 'text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1',
                formFieldInput: 'bg-[#14142a] border border-white/[0.08] text-[#eef2ff] placeholder:text-slate-600 rounded-xl text-[14px] transition-all focus:outline-none focus:bg-[#1a1a35] focus:border-violet-500/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]',
                formFieldInputShowPasswordButton: 'text-slate-600 hover:text-slate-400',
                formFieldErrorText: 'text-red-400 text-[11px] mt-0.5',
                formButtonPrimary: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[14px] rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all border-0',
                dividerRow: 'my-3',
                dividerLine: 'bg-white/[0.07]',
                dividerText: 'text-slate-600 text-[11px] px-3',
                socialButtonsBlockButton: 'bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-xl hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all',
                socialButtonsBlockButtonText: 'text-[13px] font-medium',
                footer: 'hidden',
                footerAction: 'hidden',
                alert: 'bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-[13px]',
                identityPreviewText: 'text-slate-300',
                identityPreviewEditButton: 'text-violet-400 hover:text-violet-300',
              }
            }}
          />

          {/* Footer links */}
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-[13px] text-slate-500">
              No account?{' '}
              <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                Create one free →
              </Link>
            </p>
            <Link href="/" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
              ← Back to Aiscern
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
