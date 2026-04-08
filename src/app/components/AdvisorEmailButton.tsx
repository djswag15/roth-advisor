'use client'

import { useState } from 'react'
import type { Analysis, SessionState } from '@/app/lib/engine'

interface AdvisorEmailProps {
  state: SessionState
  analysis: Analysis
}

export default function AdvisorEmailButton({ state, analysis }: AdvisorEmailProps) {
  const [advisorEmail, setAdvisorEmail] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendToAdvisor = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!advisorEmail || !advisorEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/send-advisor-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisorEmail,
          clientAge: state.age,
          recommendedConversion: analysis.optConv,
          taxSavings: analysis.taxDelta,
          currentBracket: state.bracket,
          retirementBracket: analysis.margLater,
          rmdEst: analysis.rmdEst,
        })
      })

      if (response.ok) {
        setSent(true)
        setAdvisorEmail('')
        setTimeout(() => {
          setSent(false)
          setShowForm(false)
        }, 2000)
      } else {
        setError('Failed to send email. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {sent ? (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          textAlign: 'center',
          color: '#166534',
          fontWeight: 500
        }}>
          ✓ Email sent successfully to {advisorEmail}
        </div>
      ) : showForm ? (
        <form onSubmit={handleSendToAdvisor} style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
            Send to your financial advisor or CPA:
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="email"
              placeholder="advisor@example.com"
              value={advisorEmail}
              onChange={(e) => {
                setAdvisorEmail(e.target.value)
                setError(null)
              }}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '4px',
                border: error ? '2px solid #dc2626' : '1px solid #d1d5db',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={loading || !advisorEmail}
              style={{
                padding: '8px 16px',
                backgroundColor: loading || !advisorEmail ? '#d1d5db' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 500,
                cursor: loading || !advisorEmail ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
          {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: '0' }}>{error}</p>}
          <button
            type="button"
            onClick={() => setShowForm(false)}
            style={{
              marginTop: '8px',
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '6px',
            color: '#0c4a6e',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📧 Send to My Advisor
        </button>
      )}
    </>
  )
}
