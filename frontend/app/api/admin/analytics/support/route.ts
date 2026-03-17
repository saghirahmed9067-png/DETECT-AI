import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // TODO: check role + replace with real DB query
  return NextResponse.json({ data: { message: 'support analytics — replace with real data' } })
}
