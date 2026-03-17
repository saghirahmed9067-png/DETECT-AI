'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'

// Role hierarchy
const ROLE_LEVEL: Record<string, number> = {
  USER: 0, SUPPORT: 1, MARKETING: 2, ANALYST: 3, MANAGER: 4, EXECUTIVE: 5, OWNER: 6,
}

export function RoleGuard({ required, children }: { required: string; children: React.ReactNode }) {
  const { user } = useAuth()
  const router   = useRouter()
  // TODO: fetch actual role from user metadata / Supabase
  const role     = (user as any)?.publicMetadata?.role ?? 'OWNER' // default OWNER for dev

  useEffect(() => {
    if ((ROLE_LEVEL[role] ?? 0) < (ROLE_LEVEL[required] ?? 0)) {
      router.replace('/unauthorized')
    }
  }, [role, required, router])

  return <>{children}</>
}
