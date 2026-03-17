import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SignUp
        routing="hash"
        forceRedirectUrl="/dashboard"
        signInUrl="/login"
      />
      <div className="mt-6 text-center">
        <a href="/detect/text" className="text-sm text-text-muted hover:text-primary transition-colors">
          → Continue without signing in — everything is free
        </a>
      </div>
    </div>
  )
}
