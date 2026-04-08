import { createClient } from '@supabase/supabase-js'
import type { Session, SessionState, ChatMessage } from './engine'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let supabaseClient: ReturnType<typeof createClient> | null = null

// Only initialize on client side
const getSupabaseClient = () => {
  if (typeof window === 'undefined') return null
  if (!supabaseClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabaseClient
}

// ─── Save session to Supabase ─────────────────────────────────────────────────

export async function saveSessionToSupabase(session: Session): Promise<string | null> {
  const client = getSupabaseClient()
  if (!client) return null

  try {
    // @ts-ignore - Supabase types
    const { data, error } = await client.from('sessions').upsert({
      id: session.id,
      state: session.state,
      chat_history: session.chatHistory,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id'
    }).select('share_token').single()

    if (error) {
      console.error('Error saving session to Supabase:', error)
      return null
    }

    return (data as any)?.share_token || null
  } catch (err) {
    console.error('Unexpected error saving to Supabase:', err)
    return null
  }
}

// ─── Load session from Supabase by share token ─────────────────────────────────

export async function loadSessionByShareToken(shareToken: string): Promise<Session | null> {
  const client = getSupabaseClient()
  if (!client) return null

  try {
    // @ts-ignore - Supabase types
    const { data, error } = await client.from('sessions').select('id, state, chat_history, created_at, updated_at').eq('share_token', shareToken).single()

    if (error || !data) {
      console.error('Error loading session:', error)
      return null
    }

    const d = data as any
    // Reconstruct session object
    const session: Session = {
      id: d.id,
      version: 2,
      name: buildSessionName(d.state as SessionState),
      createdAt: new Date(d.created_at).getTime(),
      updatedAt: new Date(d.updated_at).getTime(),
      state: d.state as SessionState,
      chatHistory: (d.chat_history as ChatMessage[]) || [],
      chatInitialized: d.chat_history ? (d.chat_history as ChatMessage[]).length > 0 : false,
    }

    return session
  } catch (err) {
    console.error('Unexpected error loading from Supabase:', err)
    return null
  }
}

// ─── Generate share link ──────────────────────────────────────────────────────

export function generateShareLink(shareToken: string): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://roth-advisor.vercel.app'
  return `${baseUrl}?share=${shareToken}`
}

// ─── Get share token from URL ─────────────────────────────────────────────────

export function getShareTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('share')
}

// ─── Helper: Build session name from state ────────────────────────────────────

function buildSessionName(state: SessionState): string {
  const age = state.age || 0
  const amount = state.conversionAmount || 0
  const bracket = state.bracket || 0
  return `Age ${age} • $${amount.toLocaleString()} • ${bracket}% bracket`
}

// ─── Sync: Save locally first, then to Supabase ────────────────────────────────

export async function syncSessionToCloud(session: Session): Promise<void> {
  try {
    // Always save to localStorage first
    const localSessions = getAllLocalSessions()
    localSessions[session.id] = session
    setLocalSessions(localSessions)

    // Then try to sync to Supabase
    await saveSessionToSupabase(session)
  } catch (err) {
    console.error('Error syncing to cloud:', err)
    // Fail silently - local storage is the fallback
  }
}

// ─── Local session helpers ─────────────────────────────────────────────────────

const SESSIONS_KEY = 'roth-sessions-v2'

function getAllLocalSessions(): Record<string, Session> {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLocalSessions(sessions: Record<string, Session>): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch {
    console.error('Error saving to localStorage')
  }
}
