'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set LOCAL persistence — user stays logged in until they explicitly sign out
    if (auth) {
      setPersistence(auth, browserLocalPersistence).catch(console.error)
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)

      if (u) {
        try {
          const idToken = await u.getIdToken()
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          })
        } catch (e) {
          console.error('Session sync error:', e)
        }
      } else {
        try { await fetch('/api/auth/session', { method: 'DELETE' }) } catch {}
      }
    })
    return unsub
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    await fetch('/api/auth/session', { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
