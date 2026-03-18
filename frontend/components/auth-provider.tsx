'use client'
/**
 * Aiscern — Auth Provider (Clerk)
 *
 * Wraps Clerk into a simple { user, loading, signOut } context.
 * Also auto-creates/syncs the Supabase profile row on every sign-in,
 * including Google OAuth redirects — eliminating all Firebase auth.
 *
 * user.uid   → Clerk userId  (maps to user_id in Supabase)
 * user.email → primary email
 */
import { createContext, useContext, useEffect, useRef } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'

interface AuthUser {
  uid:         string
  email:       string | null
  displayName: string | null
  photoURL:    string | null
}

interface AuthContextValue {
  user:    AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  loading: true,
  signOut: async () => {},
})

async function syncProfile(user: AuthUser) {
  try {
    await fetch('/api/profiles/create', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        uid:          user.uid,
        email:        user.email,
        display_name: user.displayName,
      }),
    })
  } catch { /* non-fatal — profile sync is best-effort */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const syncedRef = useRef<string | null>(null)

  const authUser: AuthUser | null = user ? {
    uid:         user.id,
    email:       user.primaryEmailAddress?.emailAddress ?? null,
    displayName: user.fullName ?? user.username ?? null,
    photoURL:    user.imageUrl ?? null,
  } : null

  // Auto-sync Supabase profile once per session (covers Google OAuth redirects)
  useEffect(() => {
    if (authUser && syncedRef.current !== authUser.uid) {
      syncedRef.current = authUser.uid
      syncProfile(authUser)
    }
  }, [authUser?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    syncedRef.current = null
    await clerkSignOut({ redirectUrl: '/login' })
  }

  return (
    <AuthContext.Provider value={{ user: authUser, loading: !isLoaded, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
