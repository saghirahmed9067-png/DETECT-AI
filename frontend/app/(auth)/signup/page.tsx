'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Sparkles, ArrowRight, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'

const perks = [
  '50 free scans per month',
  'Image, audio, video & text detection',
  'Scan history & analytics',
  'Web scraper access',
]

export default function SignupPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 animate-glow-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black gradient-text">DETECTAI</h1>
          <p className="text-text-muted mt-1 text-sm">Join thousands detecting AI content</p>
        </div>

        <div className="card space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <Sparkles className="w-3 h-3" /> Free forever plan
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Create your account</h2>
            <p className="text-text-muted mt-1 text-sm">Email verification included via Auth0</p>
          </div>

          {/* Perks */}
          <div className="space-y-2.5">
            {perks.map(p => (
              <div key={p} className="flex items-center gap-3 text-sm text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald" />
                </div>
                {p}
              </div>
            ))}
          </div>

          <a
            href="/api/auth/signup"
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-3 text-base font-semibold rounded-xl no-underline"
          >
            <Shield className="w-5 h-5" />
            Sign up with Auth0
            <ArrowRight className="w-4 h-4" />
          </a>

          <p className="text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-text-disabled">
            <span>🔒 Secured by Auth0</span>
            <span>•</span>
            <span>✉️ Email verified</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
