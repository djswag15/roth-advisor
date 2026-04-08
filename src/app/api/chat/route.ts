import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/app/lib/prompt'
import type { SessionState, ChatMessage } from '@/app/lib/engine'

// Initialise client once (module-level singleton)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─── Request validation ────────────────────────────────────────────────────────

interface ChatRequest {
  messages: ChatMessage[]
  state: SessionState
}

function isValidRequest(body: unknown): body is ChatRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.messages)) return false
  if (!b.state || typeof b.state !== 'object') return false
  return true
}

// ─── Rate limiting (simple in-memory, swap for Redis in prod) ─────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30        // requests
const RATE_WINDOW = 60_000   // per 60 seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  record.count++
  if (record.count > RATE_LIMIT) return true
  return false
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    )
  }

  // 2. Parse and validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: 'Request must include messages array and state object.' },
      { status: 400 }
    )
  }

  const { messages, state } = body

  // 3. Sanitise message history — cap at last 40 turns, text only
  const safeMessages = messages
    .slice(-40)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: String(m.content).slice(0, 4000), // cap per-message length
    }))

  // 4. Ensure we have at least one message
  if (safeMessages.length === 0) {
    safeMessages.push({
      role: 'user',
      content:
        'Please greet me and give me my single most important Roth conversion insight based on my profile. Be warm, specific to my numbers, and end with one clear next action.',
    })
  }

  // 5. Call Anthropic API
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(state),
      messages: safeMessages,
    })

    const text =
      response.content.find((b) => b.type === 'text')?.text ??
      'I had trouble generating a response. Please try again.'

    return NextResponse.json({ reply: text })

  } catch (err: unknown) {
    console.error('[/api/chat] Anthropic error:', err)

    // Surface specific Anthropic errors as friendly messages
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status: number }).status
      if (status === 401) {
        return NextResponse.json(
          { error: 'API key is invalid. Please contact support.' },
          { status: 500 }
        )
      }
      if (status === 529 || status === 503) {
        return NextResponse.json(
          { error: 'The AI service is temporarily busy. Please try again in a moment.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// Block all other HTTP methods cleanly
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
