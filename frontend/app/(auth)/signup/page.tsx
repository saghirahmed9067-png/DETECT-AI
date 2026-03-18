'use client'
import { useState, useEffect } from 'react'
import { SignUp, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Shield, CheckCircle } from 'lucide-react'

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen bg-[#07070d] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Aiscern" width={36} height={25}
            className="object-contain" priority />
          <span className="text-lg font-black bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Aiscern
          </span>
        </Link>
        <Link href="/login"
          className="text-sm text-slate-400 hover:text-white transition-colors">
          Have an account? <span className="text-violet-400 font-semibold">Sign in →</span>
        </Link>
      </div>

      <div className="flex flex-1">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-center px-16 w-[480px] bg-gradient-to-b from-violet-950/30 to-transparent border-r border-white/5">
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs text-emerald-300 font-medium mb-4">
                <Shield className="w-3 h-3" /> Free forever — no credit card
              </div>
              <h2 className="text-3xl font-black text-white leading-tight">
                Start detecting AI<br/>
                <span className="text-violet-400">in seconds</span>
              </h2>
            </div>
            <ul className="space-y-3">
              {[
                'All 6 detection tools — unlimited scans',
                'Scan history saved to your account',
                'Batch scan up to 20 files at once',
                'AI Detection Assistant chat',
                'API access for developers',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-400 italic">
                "Aiscern is the most accurate AI detector I've used. Detected ChatGPT
                rewrites that other tools missed."
              </p>
              <p className="text-xs text-slate-500 mt-2">— Editor, major news publication</p>
            </div>
          </div>
        </div>

        {/* Right panel - Clerk SignUp */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-[400px] space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-black text-white">Create free account</h1>
              <p className="text-slate-400 text-sm mt-1">Join thousands detecting AI content daily</p>
            </div>

            {mounted && (
              <SignUp
                forceRedirectUrl="/dashboard"
                fallbackRedirectUrl="/dashboard"
                signInUrl="/login"
                appearance={{
                  variables: {
                    colorPrimary: '#7c3aed',
                    colorBackground: '#0f0f1a',
                    colorInputBackground: '#0a0a14',
                    colorInputText: '#e2e8f0',
                    colorText: '#e2e8f0',
                    colorTextSecondary: '#94a3b8',
                    colorTextOnPrimaryBackground: '#ffffff',
                    colorDanger: '#f43f5e',
                    borderRadius: '10px',
                    fontSize: '14px',
                  },
                  elements: {
                    card: 'bg-[#0f0f1a] border border-[#1e1e2e] shadow-2xl shadow-black/60 rounded-2xl',
                    headerTitle: 'text-white font-black',
                    headerSubtitle: 'text-slate-400',
                    socialButtonsBlockButton: 'bg-[#161622] border border-[#2a2a3e] text-white hover:bg-[#1e1e2e] transition-colors',
                    socialButtonsBlockButtonText: 'text-white font-medium',
                    dividerLine: 'bg-[#1e1e2e]',
                    dividerText: 'text-slate-500',
                    formFieldLabel: 'text-slate-300 font-medium',
                    formFieldInput: 'bg-[#07070d] border-[#1e1e2e] text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30',
                    formButtonPrimary: 'bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors',
                    footerActionLink: 'text-violet-400 hover:text-violet-300',
                    footerAction: 'text-slate-400',
                    identityPreviewText: 'text-white',
                    alertText: 'text-red-400',
                    formResendCodeLink: 'text-violet-400',
                    otpCodeFieldInput: 'bg-[#07070d] border-[#1e1e2e] text-white',
                    logoBox: 'hidden',
                    logoImage: 'hidden',
                  },
                  layout: {
                    socialButtonsPlacement: 'top',
                    showOptionalFields: false,
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
