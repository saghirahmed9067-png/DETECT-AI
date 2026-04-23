/**
 * Aiscern — Server-side admin role verification
 *
 * Admin routes MUST call verifyAdmin() before any data access.
 * Role is stored in Clerk publicMetadata: { role: "ADMIN" | "OWNER" | ... }
 *
 * Env: ADMIN_USER_IDS  — comma-separated Clerk user IDs always treated as admin
 *      (emergency fallback if metadata not yet set)
 */
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const ADMIN_ROLES = new Set(['ADMIN', 'OWNER', 'EXECUTIVE', 'MANAGER', 'ANALYST', 'MARKETING', 'SUPPORT'])

export interface AdminVerifyResult {
  userId: string
  role: string
}

export async function verifyAdmin(): Promise<AdminVerifyResult | NextResponse> {
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Clerk publicMetadata role
    const meta = (sessionClaims as any)?.publicMetadata ?? {}
    const role = (meta.role as string | undefined)?.toUpperCase() ?? ''

    // Fallback: env-listed admin user IDs
    const allowedIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)

    if (!ADMIN_ROLES.has(role) && !allowedIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
    }

    return { userId, role: role || 'ADMIN' }
  } catch (err) {
    return NextResponse.json({ error: 'Auth error' }, { status: 401 })
  }
}

/** Convenience: returns true if result is an error response */
export function isAdminError(r: AdminVerifyResult | NextResponse): r is NextResponse {
  return r instanceof NextResponse
}
