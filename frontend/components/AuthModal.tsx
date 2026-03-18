'use client'
/**
 * AuthModal — navigates to /login or /signup which have
 * embedded Clerk SignIn/SignUp components directly in the page.
 */
import { useRouter } from 'next/navigation'

interface Props {
  mode: 'signIn' | 'signUp'
  children: React.ReactElement
  className?: string
}

export function AuthModal({ mode, children, className }: Props) {
  const router = useRouter()

  const open = () => {
    router.push(mode === 'signIn' ? '/login' : '/signup')
  }

  return (
    <span className={className} onClick={open} style={{ cursor: 'pointer' }}>
      {children}
    </span>
  )
}
