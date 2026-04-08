import { authenticateAdvisor } from '@/app/lib/advisor-auth'
import { NextRequest, NextResponse } from 'next/server'

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_WINDOW = 900_000 // 15 minutes

function isLoginLocked(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 0, resetAt: now + LOCKOUT_WINDOW })
    return false
  }
  if (record.count >= MAX_ATTEMPTS) {
    return true
  }
  record.count++
  return false
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (isLoginLocked(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    const result = await authenticateAdvisor(email, password)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      )
    }

    // Reset login attempts on success
    loginAttempts.delete(ip)

    return NextResponse.json({
      success: true,
      advisor: result.advisor,
      token: result.token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
