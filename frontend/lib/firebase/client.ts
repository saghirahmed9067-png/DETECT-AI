import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Config hardcoded for reliability — these are public NEXT_PUBLIC values,
// safe to be in source code (Firebase API keys are not secret)
const firebaseConfig = {
  apiKey:            'AIzaSyCMbmpuHY7DXPTNsT-X8KfakBJ8TFaAM2w',
  authDomain:        'detectai-prod.firebaseapp.com',
  projectId:         'detectai-prod',
  storageBucket:     'detectai-prod.firebasestorage.app',
  messagingSenderId: '830272475702',
  appId:             '1:830272475702:web:51cf8033f52f28d603fe97',
  measurementId:     'G-FE84SYHN99',
}

const app: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig)

export const auth = typeof window !== 'undefined' ? getAuth(app) : null as any
export const googleProvider = new GoogleAuthProvider()
export default app
