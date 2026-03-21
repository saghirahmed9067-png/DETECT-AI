'use client'
import { useEffect } from 'react'
import { SignUp, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

const PERKS = [
  'Unlimited AI text detection',
  'Image & deepfake analysis',
  'Audio voice clone detection',
  'Video deepfake scanning',
  'Scan history & export',
  'Priority detection queue',
]

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#05050f]">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-gradient-to-br from-[#0a0a1e] to-[#06060f]">
        <div className="absolute top-[-15%] right-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-violet-500/8 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <Image src="/logo.png" alt="Aiscern" width={44} height={30}
              className="object-contain drop-shadow-[0_0_16px_rgba(245,100,0,0.6)] group-hover:drop-shadow-[0_0_24px_rgba(245,100,0,0.8)] transition-all" priority />
            <span className="text-2xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Aiscern
            </span>
          </Link>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
              ✦ Free forever — no credit card
            </div>
            <h1 className="text-4xl xl:text-5xl font-black leading-tight text-white mb-4">
              Start detecting<br />
              <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
                AI content today
              </span>
            </h1>
            <p className="text-base text-slate-400 leading-relaxed max-w-sm">
              Join thousands of researchers, journalists and businesses using Aiscern to verify content authenticity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {PERKS.map(perk => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-sm text-slate-300">{perk}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex -space-x-2">
              {['🧑‍💼','👩‍🔬','🧑‍🎓','👨‍💻'].map((e,i)=>(
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm border-2 border-[#0a0a1e]">{e}</div>
              ))}
            </div>
            <div>
              <div className="text-xs font-bold text-white">10,000+ users</div>
              <div className="text-[11px] text-slate-500">detecting AI content daily</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-600">
          © 2026 Aiscern · AI Content Detection Platform
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen lg:min-h-0 p-5 sm:p-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-indigo-600/6 blur-[80px] pointer-events-none lg:hidden" />

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Aiscern" width={40} height={27}
              className="object-contain drop-shadow-[0_0_12px_rgba(245,100,0,0.55)]" priority />
            <span className="text-xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Aiscern
            </span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />Free forever · No credit card
          </div>
        </div>

        <div className="w-full max-w-[400px] xl:max-w-[420px] relative z-10">
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">Create your account</h2>
            <p className="text-sm text-slate-400">Free forever — detect AI content in seconds</p>
          </div>

          <SignUp
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            signInUrl="/login"
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
                formButtonPrimary: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[14px] rounded-xl shadow-lg shadow-violet-500/25 transition-all border-0',
                dividerRow: 'my-3',
                dividerLine: 'bg-white/[0.07]',
                dividerText: 'text-slate-600 text-[11px] px-3',
                socialButtonsBlockButton: 'bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-xl hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all',
                socialButtonsBlockButtonText: 'text-[13px] font-medium',
                footer: 'hidden',
                footerAction: 'hidden',
                alert: 'bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-[13px]',
              }
            }}
          />

          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-[13px] text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                Sign in →
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
