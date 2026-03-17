import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// In-memory store for demo — replace with Supabase query
const reviews: any[] = []

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tool   = searchParams.get('tool')    ?? ''
  const rating = parseInt(searchParams.get('rating') ?? '0')
  const sort   = searchParams.get('sort')    ?? 'helpful'
  const page   = parseInt(searchParams.get('page')   ?? '1')
  const limit  = 12

  let data = [...reviews]
  if (tool)   data = data.filter(r => r.toolUsed === tool)
  if (rating) data = data.filter(r => r.rating   === rating)
  if (sort === 'helpful') data.sort((a,b) => b.helpfulCount - a.helpfulCount)
  if (sort === 'newest')  data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (sort === 'rating')  data.sort((a,b) => b.rating - a.rating)

  const total  = data.length
  const paged  = data.slice((page - 1) * limit, page * limit)
  return NextResponse.json({ data: paged, total, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rating, title, body: reviewBody, toolUsed } = body

  if (!rating || rating < 1 || rating > 5)
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  if (!title?.trim() || title.length > 100)
    return NextResponse.json({ error: 'Title required (max 100 chars)' }, { status: 400 })
  if (!reviewBody?.trim() || reviewBody.length < 50 || reviewBody.length > 1000)
    return NextResponse.json({ error: 'Body must be 50-1000 chars' }, { status: 400 })

  // TODO: replace with Supabase insert
  const review = {
    id: crypto.randomUUID(),
    userId, rating, title, body: reviewBody, toolUsed,
    verified: false, helpfulCount: 0, published: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  reviews.push(review)
  return NextResponse.json({ data: review }, { status: 201 })
}
