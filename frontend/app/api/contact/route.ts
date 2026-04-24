import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const rl = await checkRateLimit('scraper', ip)   // 5/min
  if (rl.limited) return NextResponse.json(rateLimitResponse(), { status: 429 })

  try {
    const { name, email, subject, message } = await req.json()
    if (!name || !email || !message)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Sanitize lengths
    const safeName    = String(name).slice(0, 100)
    const safeEmail   = String(email).slice(0, 254)
    const safeSubject = String(subject || '').slice(0, 200)
    const safeMessage = String(message).slice(0, 2000)

    // Basic email format check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(safeEmail))
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

    console.log('[Contact]', { name: safeName, email: safeEmail, subject: safeSubject, ts: new Date().toISOString() })

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Aiscern Contact <noreply@aiscern.com>',
          to:   ['contact@aiscern.com'],
          subject: `[Aiscern Contact] ${safeSubject} — ${safeName}`,
          html: `<h2>New Contact Form Submission</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Subject:</strong> ${safeSubject}</p><p><strong>Message:</strong></p><p>${safeMessage.replace(/\n/g, '<br>')}</p>`,
          reply_to: safeEmail,
        }),
      })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
