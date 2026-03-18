import type { Metadata } from 'next'
import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Create Free Account | Aiscern — AI Detector',
  description: 'Create a free Aiscern account to save scan history, access batch scanning, and detect AI-generated content unlimited.',
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">

      {/* Logo + brand */}
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Aiscern Logo"
          width={52}
          height={36}
          className="object-contain drop-shadow-[0_0_12px_rgba(245,100,0,0.5)]"
          priority
        />
        <span className="text-2xl font-black gradient-text">Aiscern</span>
      </Link>

      {/* Clerk sign-up widget — Google OAuth enabled via Clerk Dashboard */}
      <SignUp
        routing="hash"
        forceRedirectUrl="/dashboard"
        signInUrl="/login"
        appearance={{
          elements: {
            rootBox:             'w-full max-w-md',
            card:                'bg-surface border border-border shadow-2xl rounded-2xl',
            headerTitle:         'text-text-primary font-black',
            headerSubtitle:      'text-text-muted',
            socialButtonsBlockButton:
              'border border-border bg-surface-hover hover:bg-surface-active text-text-primary font-semibold transition-all',
            socialButtonsBlockButtonText: 'font-semibold',
            dividerLine:         'bg-border',
            dividerText:         'text-text-muted',
            formFieldLabel:      'text-text-secondary font-medium',
            formFieldInput:
              'bg-surface border-border text-text-primary placeholder:text-text-disabled focus:border-primary focus:ring-primary/20',
            formButtonPrimary:
              'bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all',
            footerActionLink:    'text-primary hover:underline',
            identityPreviewText: 'text-text-primary',
            alertText:           'text-rose-400',
          },
          layout: {
            socialButtonsPlacement: 'top',
            showOptionalFields: false,
          },
        }}
      />

      <p className="text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in →
        </Link>
      </p>

      <p className="text-xs text-text-disabled max-w-sm text-center">
        Signing up gives you scan history &amp; batch access. All detections are free — no credit card ever required.
      </p>
    </div>
  )
}
