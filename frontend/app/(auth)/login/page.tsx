'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
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
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black gradient-text">DETECTAI</h1>
          <p className="text-text-muted mt-2">Unmask the Machine</p>
        </div>

        <div className="card text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
            <p className="text-text-muted mt-1 text-sm">Sign in to your account to continue</p>
          </div>

          <a
            href="/api/auth/login"
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-3 text-base font-semibold rounded-xl no-underline"
          >
            <Shield className="w-5 h-5" />
            Sign in with Auth0
            <ArrowRight className="w-4 h-4" />
          </a>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-sm text-text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Create one free
            </Link>
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-text-disabled pt-2">
            <span>🔒 Secured by Auth0</span>
            <span>•</span>
            <span>Email verification required</span>
          </div>
        </div>

        <p className="text-center text-xs text-text-disabled mt-6">
          By signing in you agree to our{' '}
          <span className="underline cursor-pointer">Terms of Service</span> and{' '}
          <span className="underline cursor-pointer">Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  )
}
