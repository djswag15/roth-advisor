'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getAllSessions, createSession, getSession, saveSession,
  deleteSession, renameSession, getLastSessionId, setCurrentSessionId,
  getSessionsSortedByDate, buildSessionName, timeAgo, migrateSession,
} from '@/app/lib/sessions'
import { getShareTokenFromUrl, loadSessionByShareToken, syncSessionToCloud, generateShareLink } from '@/app/lib/supabase'
import type { Session, SessionState } from '@/app/lib/engine'
import { analytics } from '@/app/lib/analytics'
import WelcomeScreen from './WelcomeScreen'
import { PageAbout, PageSavings, PageIncome, PageGoals } from './pages/PageAbout'
import PageResults from './pages/PageResults'

const STEPS = ['About you', 'Your savings', 'Income & taxes', 'Your goals', 'Results']

export default function RothAdvisor() {
  const [session, setSession] = useState<Session | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const [toast, setToast] = useState<string | null>(null)
  const [view, setView] = useState<'welcome' | 'app'>('welcome')
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      // Check if loading from shared link
      const token = getShareTokenFromUrl()
      if (token) {
        // Track share link click
        analytics.trackConversion('share_link_opened', 1, { share_token: token.substring(0, 8) })
        const sharedSession = await loadSessionByShareToken(token)
        if (sharedSession) {
          setSession(migrateSession(sharedSession))
          setShareToken(token)
          setView('app')
          return
        }
      }

      // Otherwise, load last session or create new
      const lastId = getLastSessionId()
      if (lastId) {
        const existing = getSession(lastId)
        if (existing) {
          setSession(migrateSession(existing))
          setView('welcome')
          return
        }
      }
      const sessions = getSessionsSortedByDate()
      if (sessions.length > 0) {
        setView('welcome')
      } else {
        const fresh = createSession()
        setSession(fresh)
        setView('app')
      }
    }

    loadSession()
  }, [])

  const scheduleSave = useCallback((updated: Session) => {
    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      saveSession(updated)
      // Sync to cloud
      await syncSessionToCloud(updated)
      setSaveStatus('saved')
    }, 1200)
  }, [])

  const updateState = useCallback((patch: Partial<SessionState>) => {
    setSession(prev => {
      if (!prev) return prev
      const updated: Session = {
        ...prev,
        state: { ...prev.state, ...patch },
        name: buildSessionName({ ...prev.state, ...patch }),
      }
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  const goTo = useCallback((page: number) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = { ...prev, state: { ...prev.state, currentPage: page } }
      saveSession(updated)
      return updated
    })
  }, [])

  const resumeSession = useCallback((id: string) => {
    const sess = getSession(id)
    if (!sess) return
    setCurrentSessionId(id)
    setSession(migrateSession(sess))
    setView('app')
  }, [])

  const startNew = useCallback(() => {
    const fresh = createSession()
    setSession(fresh)
    setView('app')
  }, [])

  const handleDelete = useCallback((id: string) => {
    deleteSession(id)
    if (session?.id === id) {
      const remaining = getSessionsSortedByDate()
      if (remaining.length > 0) {
        setSession(migrateSession(remaining[0]))
        setCurrentSessionId(remaining[0].id)
      } else {
        const fresh = createSession()
        setSession(fresh)
        setView('app')
      }
    }
  }, [session])

  const handleRename = useCallback((id: string) => {
    const sess = getSession(id)
    if (!sess) return
    const newName = window.prompt('Enter a name for this session:', sess.name)
    if (newName?.trim()) {
      renameSession(id, newName.trim())
      setSession(prev => prev?.id === id ? { ...prev, name: newName.trim() } : prev)
    }
  }, [])

  const handleSaveNow = useCallback(async () => {
    if (!session) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveSession(session)
    // Sync to cloud and get share link
    await syncSessionToCloud(session)
    const link = generateShareLink(session.id)
    setShareLink(link)
    setSaveStatus('saved')
    setToast('Session saved & ready to share!')
    setTimeout(() => setToast(null), 2500)
  }, [session])

  const updateChatHistory = useCallback((chatHistory: Session['chatHistory'], chatInitialized: boolean) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = { ...prev, chatHistory, chatInitialized }
      saveSession(updated)
      return updated
    })
  }, [])

  if (view === 'welcome' || !session) {
    return (
      <WelcomeScreen
        sessions={getSessionsSortedByDate()}
        lastSessionId={getLastSessionId()}
        onResume={resumeSession}
        onNew={startNew}
        onDelete={handleDelete}
        onRename={handleRename}
      />
    )
  }

  const { state } = session
  const currentPage = state.currentPage ?? 0
  const pageProps = { state, onUpdate: updateState }

  return (
    <div className="page-wrap">
      {toast && <div className="toast show">{toast}</div>}

      <div className="progress-bar">
        {STEPS.map((label, i) => {
          const cls = i < currentPage ? 'done' : i === currentPage ? 'active' : ''
          return (
            <div key={i} style={{ display: 'contents' }}>
              <div
                className={`step-dot ${cls}`}
                onClick={() => i < currentPage && goTo(i)}
                title={i < currentPage ? `Back to: ${label}` : label}
              >
                {i < currentPage ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
        <div className="save-indicator">
          <div className={`save-dot ${saveStatus === 'saving' ? 'saving' : ''}`} />
          <span>{saveStatus === 'saving' ? 'Saving…' : 'All changes saved'}</span>
        </div>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={handleSaveNow}>Save & Share</button>
          <button className="btn btn-sm" onClick={() => setView('welcome')}>All sessions</button>
          <button className="btn btn-sm" onClick={startNew}>New session</button>
        </div>
      </div>

      {shareLink && (
        <div style={{ 
          background: '#f0f9ff', 
          border: '1px solid #0ea5e9', 
          borderRadius: '8px', 
          padding: '12px 16px', 
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '14px', color: '#0c4a6e', flex: 1, minWidth: '200px', wordBreak: 'break-all' }}>
            📎 Share: {shareLink}
          </span>
          <button 
            className="btn btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(shareLink)
              setToast('Link copied!')
              setTimeout(() => setToast(null), 2000)
            }}
          >
            Copy Link
          </button>
        </div>
      )}

      {currentPage === 0 && <PageAbout   {...pageProps} />}
      {currentPage === 1 && <PageSavings {...pageProps} />}
      {currentPage === 2 && <PageIncome  {...pageProps} />}
      {currentPage === 3 && <PageGoals   {...pageProps} />}
      {currentPage === 4 && (
        <PageResults
          state={state}
          sessionId={session.id}
          chatHistory={session.chatHistory}
          chatInitialized={session.chatInitialized}
          onChatUpdate={updateChatHistory}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          {currentPage > 0 && (
            <button className="btn" onClick={() => goTo(currentPage - 1)}>← Back</button>
          )}
        </div>
        <div>
          {currentPage < 4 && (
            <button className="btn btn-primary" onClick={() => goTo(currentPage + 1)}>Continue →</button>
          )}
        </div>
      </div>
    </div>
  )
}
