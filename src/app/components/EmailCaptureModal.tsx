'use client'

import { useState } from 'react'
import { saveEmailToSupabase, isValidEmail } from '@/app/lib/email'
import { analytics } from '@/app/lib/analytics'

interface EmailCaptureModalProps {
  sessionId: string
  onClose: () => void
}

export default function EmailCaptureModal({ sessionId, onClose }: EmailCaptureModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      analytics.trackError('email_validation_failed', { reason: 'invalid_format' })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const success = await saveEmailToSupabase(email, sessionId)
      if (success) {
        setSubmitted(true)
        // Track email capture conversion
        analytics.identifySession(email, { session_id: sessionId })
        analytics.trackConversion('email_captured', 1, { email_domain: email.split('@')[1] })
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError('Failed to save email. Please try again.')
        analytics.trackError('email_save_failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      analytics.trackError('email_capture_exception', { error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={handleSkip}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'slideUp 0.3s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
                  Thank you!
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                  We'll notify you about tax law changes and new Roth strategies.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
                Stay updated
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.5' }}>
                Get notified when tax brackets or Roth rules change. We'll only email you about real opportunities.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  disabled={loading}
                  style={{
                    padding: '10px 12px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: error ? '2px solid #dc2626' : '1px solid #d1d5db',
                    fontFamily: 'inherit',
                    backgroundColor: '#fff',
                    color: '#1f2937',
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e as any)}
                />

                {error && (
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: '0' }}>
                    {error}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: loading || !email ? '#d1d5db' : '#3b82f6',
                      color: 'white',
                      cursor: loading || !email ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Saving...' : 'Save email'}
                  </button>
                </div>
              </form>

              <style>{`
                @keyframes slideUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </>
          )}
        </div>
      </div>
    </>
  )
}
