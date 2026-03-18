'use client'
import { useState, useEffect } from 'react'
import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Shield, CheckCircle } from 'lucide-react'

export default function LoginPage() {
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
        <Link href="/signup"
          className="text-sm text-slate-400 hover:text-white transition-colors">
          No account? <span className="text-violet-400 font-semibold">Sign up free →</span>
        </Link>
      </div>

      <div className="flex flex-1">
        {/* Left panel - benefits */}
        <div className="hidden lg:flex flex-col justify-center px-16 w-[480px] bg-gradient-to-b from-violet-950/30 to-transparent border-r border-white/5">
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 text-xs text-violet-300 font-medium mb-4">
                <Shield className="w-3 h-3" /> Free forever
              </div>
              <h2 className="text-3xl font-black text-white leading-tight">
                The world's most accurate<br/>
                <span className="text-violet-400">AI detector</span>
              </h2>
            </div>
            <ul className="space-y-3">
              {[
                'Detect ChatGPT, Claude & Gemini text',
                'Deepfake image & video detection',
                'AI voice clone detection',
                'Save unlimited scan history',
                'Batch scan 20 files at once',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2">
                {['#7c3aed','#2563eb','#059669','#dc2626','#d97706'].map((c,i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#07070d]"
                    style={{ background: c }} />
                ))}
              </div>
              <p className="text-xs text-slate-400">
                <span className="text-white font-semibold">5,000+</span> users trust Aiscern
              </p>
            </div>
          </div>
        </div>

        {/* Right panel - Clerk SignIn */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-[400px] space-y-6">
            <div className="text-center lg:hidden">
              <h1 className="text-2xl font-black text-white">Welcome back</h1>
              <p className="text-slate-400 text-sm mt-1">Sign in to your Aiscern account</p>
            </div>
            <div className="hidden lg:block text-center mb-2">
              <h1 className="text-2xl font-black text-white">Welcome back</h1>
              <p className="text-slate-400 text-sm mt-1">Sign in to your Aiscern account</p>
            </div>

            {/* Clerk renders here */}
            {mounted && (
              <SignIn
                forceRedirectUrl="/dashboard"
                fallbackRedirectUrl="/dashboard"
                signUpUrl="/signup"
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
                    identityPreviewEditButtonIcon: 'text-violet-400',
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
