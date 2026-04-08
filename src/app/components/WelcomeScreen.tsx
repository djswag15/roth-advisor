'use client'

import { Session } from '@/app/lib/engine'
import { timeAgo } from '@/app/lib/sessions'

interface Props {
  sessions: Session[]
  lastSessionId: string | null
  onResume: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string) => void
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

export default function WelcomeScreen({ sessions, lastSessionId, onResume, onNew, onDelete, onRename }: Props) {
  const lastSession = sessions.find(s => s.id === lastSessionId)
  const otherSessions = sessions.filter(s => s.id !== lastSessionId)

  const progress = (sess: Session) => Math.round(((sess.state.currentPage ?? 0) / 4) * 100)

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '22px', fontWeight: 500, marginBottom: '.3rem' }}>
          {lastSession ? 'Welcome back' : 'Roth Conversion Advisor'}
        </div>
        <div style={{ fontSize: '15px', color: '#666' }}>
          {lastSession
            ? 'Pick up where you left off, or start a new analysis.'
            : 'Free, personalized Roth conversion planning — built for people nearing retirement.'}
        </div>
      </div>

      {/* Resume last session */}
      {lastSession && (
        <div className="card" style={{ border: '2px solid #185FA5', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserIcon />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '2px' }}>{lastSession.name}</div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                Last updated {timeAgo(lastSession.updatedAt)} ·{' '}
                {lastSession.state.currentPage >= 4 ? 'Analysis complete' : `Step ${(lastSession.state.currentPage ?? 0) + 1} of 5`}
              </div>
              <div style={{ marginTop: '8px', height: '4px', background: '#eee', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress(lastSession)}%`, background: '#185FA5', borderRadius: '2px', transition: 'width .3s' }} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => onResume(lastSession.id)} style={{ flexShrink: 0 }}>
              Resume session
            </button>
          </div>
        </div>
      )}

      {/* Other sessions */}
      {otherSessions.length > 0 && (
        <>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '.6rem' }}>
            {lastSession ? 'Other sessions' : 'Your saved sessions'}
          </div>
          <div className="session-list" style={{ marginBottom: '1.25rem' }}>
            {otherSessions.slice(0, 5).map(sess => (
              <div key={sess.id} className="session-item" onClick={() => onResume(sess.id)}>
                <div className="session-icon"><ChartIcon /></div>
                <div className="session-body">
                  <div className="session-name">{sess.name}</div>
                  <div className="session-meta">Updated {timeAgo(sess.updatedAt)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: '12px', padding: '5px 10px', minHeight: '30px' }}
                    onClick={e => { e.stopPropagation(); onRename(sess.id); }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ fontSize: '12px', padding: '5px 10px', minHeight: '30px' }}
                    onClick={e => { e.stopPropagation(); onDelete(sess.id); }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* No sessions at all */}
      {sessions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.4rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '15px', color: '#666', lineHeight: 1.6 }}>
            Answer 4 quick pages of questions and get a personalized Roth conversion strategy, year-by-year conversion schedule, Social Security timing analysis, and an AI advisor pre-loaded with your numbers.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onNew}>
          {sessions.length === 0 ? 'Get started' : 'Start a new session'}
        </button>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '12px', color: '#aaa', lineHeight: 1.6 }}>
        Your information is saved locally on this device. This tool is for educational purposes only and is not a substitute for advice from a licensed CPA or CFP.
      </div>
    </div>
  )
}
