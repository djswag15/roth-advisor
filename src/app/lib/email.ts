import type { Session } from './engine'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// ─── Save email to Supabase ───────────────────────────────────────────────────

export async function saveEmailToSupabase(
  email: string,
  sessionId: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        session_id: sessionId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error saving email:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Error saving email to Supabase:', err)
    return false
  }
}

// ─── Validate email ───────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}
