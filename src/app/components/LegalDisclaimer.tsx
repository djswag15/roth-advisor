'use client'

import { useState, useEffect } from 'react'

export default function LegalDisclaimer() {
  const [accepted, setAccepted] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('legal-disclaimer-accepted-2026')
    if (!hasAccepted) {
      setShowModal(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('legal-disclaimer-accepted-2026', 'true')
    setShowModal(false)
    setAccepted(true)
  }

  if (!showModal) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '24px',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Disclaimer & Legal Notice</h2>

        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#4b5563', marginBottom: '20px' }}>
          <h3>Important Disclaimer</h3>
          <p>
            <strong>Roth Advisor is not a substitute for professional financial advice.</strong> This tool provides
            educational analysis based on your inputs. It does not constitute investment advice, tax advice, or a
            recommendation to take any action.
          </p>

          <h3>No Financial Advisor Relationship</h3>
          <p>
            Use of this tool does not create a financial advisor-client relationship. You should not rely solely on
            this analysis for any financial decisions. Consult with a qualified tax professional, financial advisor, or
            attorney before making any Roth conversion or retirement planning decisions.
          </p>

          <h3>Accuracy of Information</h3>
          <p>
            While we strive for accuracy, tax laws are complex and subject to change. Our calculations are based on
            current federal tax rates and may not reflect:
          </p>
          <ul>
            <li>State income tax implications</li>
            <li>Recent tax law changes</li>
            <li>Your specific tax situation</li>
            <li>Medicare IRMAA premium impacts</li>
            <li>Social Security benefit calculations</li>
          </ul>

          <h3>Limitation of Liability</h3>
          <p>
            Roth Advisor is provided "as is" without warranties. We are not liable for any financial losses, tax
            liabilities, or other damages resulting from use of this tool. Use is entirely at your own risk.
          </p>

          <h3>Data Privacy</h3>
          <p>
            Your analysis data may be stored to enable cross-device access and email notifications. See our Privacy
            Policy for details.
          </p>

          <h3>Terms of Service</h3>
          <p>
            By using Roth Advisor, you agree to our Terms of Service. We reserve the right to modify this tool and
            terms at any time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleAccept}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            I Understand & Accept
          </button>
        </div>

        <p style={{ fontSize: '11px', color: '#999', marginTop: '12px', textAlign: 'center' }}>
          You can review full Terms & Privacy Policy anytime in the footer
        </p>
      </div>
    </div>
  )
}
