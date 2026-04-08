import { sendAdvisorEmail } from '@/app/lib/resend'
import { NextRequest, NextResponse } from 'next/server'

// Simple rate limiting for email sends (swap for Redis in production)
const emailRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const EMAIL_RATE_LIMIT = 5 // per hour
const EMAIL_RATE_WINDOW = 3600_000 // 1 hour

function isEmailRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = emailRateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    emailRateLimitMap.set(ip, { count: 1, resetAt: now + EMAIL_RATE_WINDOW })
    return false
  }
  record.count++
  return record.count > EMAIL_RATE_LIMIT
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return typeof email === 'string' && emailRegex.test(email) && email.length < 254
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (isEmailRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many email requests. Please try again in an hour.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      advisorEmail,
      clientAge,
      recommendedConversion,
      taxSavings,
      currentBracket,
      retirementBracket,
      rmdEst,
    } = body

    // Validate email format
    if (!advisorEmail || !isValidEmail(advisorEmail)) {
      return NextResponse.json({ error: 'Invalid advisor email address' }, { status: 400 })
    }

    // Validate numeric fields
    if (
      typeof clientAge !== 'number' ||
      typeof recommendedConversion !== 'number' ||
      typeof taxSavings !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }

    const success = await sendAdvisorEmail(
      advisorEmail,
      'Your Client',
      clientAge,
      recommendedConversion,
      taxSavings,
      currentBracket,
      retirementBracket,
      rmdEst
    )

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in send-advisor-email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
