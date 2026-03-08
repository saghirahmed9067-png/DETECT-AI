import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getAdminAuth() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Return a mock during build time when env vars aren't available
    return null
  }
  
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    initializeApp({ credential: cert(serviceAccount) })
  }
  
  return getAuth()
}

export const adminAuth = getAdminAuth()
