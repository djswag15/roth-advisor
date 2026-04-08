import { v4 as uuidv4 } from 'uuid'
import type { Session, SessionState, ChatMessage } from './engine'

const SESSIONS_KEY = 'roth-sessions-v2'
const CURRENT_KEY  = 'roth-current-session'
const SCHEMA_VER   = 2

export const DEFAULT_STATE: SessionState = {
  age: 62,
  spouseAge: 0,
  filing: 'single',
  trad: 500000,
  roth: 50000,
  taxable: 100000,
  annualIncome: 80000,
  pensionSSI: 0,
  bracket: 22,
  stateRate: 5,
  withdrawalRate: 4,
  expectedReturn: 7,
  yearsInRetirement: 25,
  inflationRate: 3,
  conversionAmount: 50000,
  longTermCareFlag: false,
  medicareFlag: false,
  heirFlag: false,
  ssEarnings: 2000,
  currentPage: 0,
}

// ─── Safe localStorage wrapper ────────────────────────────────────────────────

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val) } catch {}
}
function safeRemove(key: string): void {
  try { localStorage.removeItem(key) } catch {}
}

// ─── Read/write all sessions ──────────────────────────────────────────────────

export function getAllSessions(): Record<string, Session> {
  try {
    const raw = safeGet(SESSIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAllSessions(sessions: Record<string, Session>): void {
  try {
    safeSet(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (e) {
    console.error('[SessionStore] Write failed:', e)
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function createSession(): Session {
  const id = uuidv4()
  const now = Date.now()
  const session: Session = {
    id,
    version: SCHEMA_VER,
    name: 'New analysis',
    createdAt: now,
    updatedAt: now,
    state: { ...DEFAULT_STATE },
    chatHistory: [],
    chatInitialized: false,
  }
  const sessions = getAllSessions()
  sessions[id] = session
  writeAllSessions(sessions)
  safeSet(CURRENT_KEY, id)
  return session
}

export function getSession(id: string): Session | null {
  const sessions = getAllSessions()
  return sessions[id] ?? null
}

export function saveSession(session: Session): void {
  const sessions = getAllSessions()
  sessions[session.id] = {
    ...session,
    updatedAt: Date.now(),
    version: SCHEMA_VER,
  }
  writeAllSessions(sessions)
  safeSet(CURRENT_KEY, session.id)
}

export function deleteSession(id: string): void {
  const sessions = getAllSessions()
  delete sessions[id]
  writeAllSessions(sessions)
  const cur = safeGet(CURRENT_KEY)
  if (cur === id) safeRemove(CURRENT_KEY)
}

export function renameSession(id: string, name: string): void {
  const sessions = getAllSessions()
  if (sessions[id]) {
    sessions[id].name = name.trim() || sessions[id].name
    sessions[id].updatedAt = Date.now()
    writeAllSessions(sessions)
  }
}

export function getLastSessionId(): string | null {
  return safeGet(CURRENT_KEY)
}

export function setCurrentSessionId(id: string): void {
  safeSet(CURRENT_KEY, id)
}

export function getSessionsSortedByDate(): Session[] {
  return Object.values(getAllSessions()).sort((a, b) => b.updatedAt - a.updatedAt)
}

// ─── Auto-name helper ─────────────────────────────────────────────────────────

export function buildSessionName(state: SessionState): string {
  const tradK = Math.round(state.trad / 1000)
  return `Age ${state.age} · $${tradK}K traditional`
}

// ─── Time formatting ──────────────────────────────────────────────────────────

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  if (s < 604800) return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) > 1 ? 's' : ''} ago`
  return new Date(ts).toLocaleDateString()
}

// ─── Schema migration (future-proofing) ───────────────────────────────────────

export function migrateSession(session: Session): Session {
  if (session.version === SCHEMA_VER) return session
  // v1 → v2: ensure all new fields exist
  return {
    ...session,
    state: { ...DEFAULT_STATE, ...session.state },
    chatHistory: session.chatHistory ?? [],
    chatInitialized: session.chatInitialized ?? false,
    version: SCHEMA_VER,
  }
}
