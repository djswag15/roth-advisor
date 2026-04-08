'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { analyze, fmt, fmtK } from '@/app/lib/engine'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { RothAdvisorPDF } from '@/app/lib/pdf'
import EmailCaptureModal from '@/app/components/EmailCaptureModal'
import ScenarioComparison from '@/app/components/ScenarioComparison'
import AdvisorEmailButton from '@/app/components/AdvisorEmailButton'
import CpaReviewModal from '@/app/components/CpaReviewModal'
import type { SessionState, ChatMessage, Session } from '@/app/lib/engine'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

interface Props {
  state: SessionState
  chatHistory: ChatMessage[]
  chatInitialized: boolean
  onChatUpdate: (history: ChatMessage[], initialized: boolean) => void
  sessionId?: string
}

const TABS = ['Balance growth', 'RMD impact', 'Conversion plan', 'Social Security', 'Scenarios', 'Pro strategies', 'Ask your advisor']

// ─────────────────────────────────────────────────────────────────────────────
export default function PageResults({ state, chatHistory, chatInitialized, onChatUpdate, sessionId }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailModalShown, setEmailModalShown] = useState(false)
  const [showCpaModal, setShowCpaModal] = useState(false)
  const a = analyze(state)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show CPA review modal if needed (only once per session)
  useEffect(() => {
    if (isClient && a.requiresCpaReview && !sessionStorage.getItem('cpa-modal-shown')) {
      const timer = setTimeout(() => {
        setShowCpaModal(true)
        sessionStorage.setItem('cpa-modal-shown', 'true')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isClient, a.requiresCpaReview])

  // Track CPA modal view
  useEffect(() => {
    if (showCpaModal) {
      const { analytics } = require('@/app/lib/analytics')
      analytics.trackFeatureUsage('cpa_modal', 'viewed', {
        compliance_warnings: a.complianceWarnings?.length || 0,
        requires_cpa: a.requiresCpaReview,
      })
    }
  }, [showCpaModal, a.complianceWarnings, a.requiresCpaReview])

  // Show email capture modal on first page load
  useEffect(() => {
    if (isClient && !emailModalShown && activeTab === 0) {
      // Delay showing modal to let page render first
      const timer = setTimeout(() => {
        setShowEmailModal(true)
        setEmailModalShown(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isClient, emailModalShown, activeTab])

  const score = a.score
  const verdict =
    score >= 60 ? { cls: 'alert-success', label: 'Roth conversion is strongly recommended for you', sub: 'Your numbers align well. Converting now will save you significantly in taxes over the course of your retirement.' }
    : score >= 35 ? { cls: 'alert-warn', label: 'Conversion is likely the right move', sub: 'Several factors point toward converting. Review the details and timing below — small decisions now compound significantly.' }
    : { cls: 'alert-info', label: 'Conversion warrants careful consideration', sub: "Let's look at your specific details — the right answer depends on some nuances in your situation." }

  return (
    <>
      {showCpaModal && (
        <CpaReviewModal 
          analysis={a}
          onDismiss={() => setShowCpaModal(false)}
        />
      )}

      {showEmailModal && sessionId && (
        <EmailCaptureModal 
          sessionId={sessionId} 
          onClose={() => setShowEmailModal(false)}
        />
      )}

      <div style={{ fontSize: 22, fontWeight: 500, marginBottom: '.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span>Your personalized analysis</span>
        {isClient && (
          <div onClick={() => {
            const { analytics } = require('@/app/lib/analytics')
            analytics.trackConversion('pdf_exported', 1, { 
              conversion_amount: a.conversionAmount,
              tax_delta: a.taxDelta 
            })
          }}>
            <PDFDownloadLink 
              document={<RothAdvisorPDF state={state} analysis={a} />} 
              fileName={`roth-advisor-${new Date().toISOString().split('T')[0]}.pdf`}
              className="btn btn-sm"
              style={{ fontSize: '13px' }}
            >
              📥 Export PDF
            </PDFDownloadLink>
          </div>
        )}
      </div>

      <div className={`alert ${verdict.cls} verdict`} style={{ padding: '1.25rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: '.35rem' }}>{verdict.label}</div>
        <div style={{ fontSize: 14, opacity: .88, lineHeight: 1.5 }}>{verdict.sub}</div>
      </div>

      {/* Metric row */}
      <div className="metric-grid">
        <div className="metric-card"><div className="metric-label">Traditional IRA/401k</div><div className="metric-value">{fmt(a.trad)}</div></div>
        <div className="metric-card"><div className="metric-label">Your bracket now</div><div className={`metric-value ${a.margNow <= a.margLater ? 'good' : 'warn'}`}>{a.margNow}%</div></div>
        <div className="metric-card"><div className="metric-label">Est. bracket in retirement</div><div className={`metric-value ${a.margLater > a.margNow ? 'bad' : 'good'}`}>{a.margLater}%</div></div>
        <div className="metric-card"><div className="metric-label">Years before RMDs</div><div className={`metric-value ${a.yearsToRMD <= 5 ? 'warn' : 'good'}`}>{a.yearsToRMD}</div></div>
        <div className="metric-card"><div className="metric-label">Ideal annual conversion</div><div className="metric-value">{fmt(a.optConv)}</div></div>
        <div className="metric-card"><div className="metric-label">Forced annual RMD (est.)</div><div className="metric-value warn">{fmt(a.rmdEst)}</div></div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
        <AdvisorEmailButton state={state} analysis={a} />
      </div>

      {/* Alerts */}
      {state.age < 59 && (
        <div className="alert alert-warn">
          <strong>5-year rule:</strong> Because you&apos;re under 59½, each Roth conversion starts its own 5-year waiting period before those dollars can be withdrawn penalty-free. Plan conversion timing carefully.
        </div>
      )}
      {a.yearsToRMD > 0 && a.yearsToRMD <= 5 && (
        <div className="alert alert-warn">
          <strong>RMD window closing:</strong> In just {a.yearsToRMD} year{a.yearsToRMD === 1 ? '' : 's'}, the IRS will require you to withdraw approximately {fmt(a.rmdEst)} per year — taxable income whether you need it or not. Converting now directly reduces this.
        </div>
      )}
      {a.yearsToRMD === 0 && (
        <div className="alert alert-error">
          <strong>RMDs have started:</strong> You cannot convert the RMD amount itself, but you can still convert additional dollars above your RMD each year. Also consider Qualified Charitable Distributions — up to $105,000/year tax-free.
        </div>
      )}
      {a.irmaaRisk && (
        <div className="alert alert-warn">
          <strong>Medicare surcharge alert (IRMAA):</strong> Based on your projected retirement income, you may owe $1,000–$4,000 more per year in Medicare premiums. Converting now reduces future RMDs and can keep you below these thresholds.
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t, i) => (
          <div key={i} className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{t}</div>
        ))}
      </div>

      {activeTab === 0 && <TabBalanceGrowth a={a} state={state} />}
      {activeTab === 1 && <TabRMD a={a} state={state} />}
      {activeTab === 2 && <TabSchedule a={a} state={state} />}
      {activeTab === 3 && <TabSocialSecurity a={a} state={state} />}
      {activeTab === 4 && <ScenarioComparison state={state} />}
      {activeTab === 5 && <TabProStrategies a={a} state={state} />}
      {activeTab === 6 && (
        <AdvisorChat
          state={state}
          chatHistory={chatHistory}
          chatInitialized={chatInitialized}
          onChatUpdate={onChatUpdate}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Balance Growth
// ─────────────────────────────────────────────────────────────────────────────
function TabBalanceGrowth({ a, state }: { a: ReturnType<typeof analyze>; state: SessionState }) {
  const data = {
    labels: a.labels,
    datasets: [
      { label: 'Traditional IRA/401k', data: a.tVals, borderColor: '#D85A30', backgroundColor: 'rgba(216,90,48,0.07)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 },
      { label: 'Roth IRA', data: a.rVals, borderColor: '#185FA5', backgroundColor: 'rgba(24,95,165,0.07)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 },
    ],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { dataset: { label: string }; parsed: { y: number } }) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } } },
    scales: {
      x: { ticks: { font: { size: 10 }, maxTicksLimit: 10 }, grid: { display: false } },
      y: { ticks: { font: { size: 10 }, callback: (v: number | string) => fmtK(Number(v)) }, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  }
  return (
    <div className="card">
      <div className="tag">Balance growth</div>
      <div style={{ fontWeight: 500, marginBottom: '.5rem', color: '#666' }}>How your accounts grow with conversions built in</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 13, color: '#666', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#D85A30', display: 'inline-block' }} />Traditional IRA/401k (taxable on withdrawal)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#185FA5', display: 'inline-block' }} />Roth IRA (tax-free forever)</span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 280 }}>
        <Line data={data} options={options as never} />
      </div>
      <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
        Assumes {state.expectedReturn}% annual return with bracket-optimized conversions over {a.schedule.length} years.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: RMD Impact
// ─────────────────────────────────────────────────────────────────────────────
function TabRMD({ a }: { a: ReturnType<typeof analyze>; state: SessionState }) {
  const filtered = a.rmdVals.filter((_, i) => i % 5 === 0 || i === 0)
  const filteredL = a.labels.filter((_, i) => i % 5 === 0 || i === 0)
  const data = {
    labels: filteredL,
    datasets: [{ label: 'Annual RMD', data: filtered, backgroundColor: '#D85A30', borderRadius: 4 }],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { parsed: { y: number } }) => `Annual RMD: ${fmt(ctx.parsed.y)}` } } },
    scales: {
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { font: { size: 10 }, callback: (v: number | string) => fmtK(Number(v)) } },
    },
  }
  return (
    <div className="card">
      <div className="tag">RMD impact</div>
      <div style={{ fontWeight: 500, marginBottom: '.5rem', color: '#666' }}>Projected required minimum distributions each year</div>
      <div style={{ position: 'relative', width: '100%', height: 260 }}>
        <Bar data={data} options={options as never} />
      </div>
      <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>RMDs begin at age 73 (SECURE 2.0 Act). Roth IRAs have zero RMDs — ever.</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Conversion Schedule
// ─────────────────────────────────────────────────────────────────────────────
function TabSchedule({ a, state }: { a: ReturnType<typeof analyze>; state: SessionState }) {
  return (
    <>
      <div className="card">
        <div className="tag">Conversion plan</div>
        <div style={{ fontWeight: 500, marginBottom: '.5rem', color: '#666' }}>Year-by-year bracket-optimized conversion amounts</div>
        <p style={{ fontSize: 14, color: '#666', marginBottom: '1rem', lineHeight: 1.5 }}>
          This plan fills your tax bracket to the ceiling each year without crossing into the next tier. Pay the tax from your brokerage account — not your IRA.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 75 }}>Age</th><th>Convert</th><th>Bracket</th><th>Tax bill</th><th>Trad. left</th><th>Roth total</th>
              </tr>
            </thead>
            <tbody>
              {a.schedule.map(r => (
                <tr key={r.yr}>
                  <td>Age {r.yr}</td>
                  <td style={{ color: '#185FA5', fontWeight: 500 }}>{fmt(r.conv)}</td>
                  <td>{r.margRate}%</td>
                  <td style={{ color: '#854F0B' }}>{fmt(r.taxCost)}</td>
                  <td>{fmt(r.tradBal)}</td>
                  <td style={{ color: '#185FA5' }}>{fmt(r.rothBal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
          Balances include {state.expectedReturn}% growth. Tax cost includes federal + {state.stateRate}% state.
        </p>
      </div>
      <div className="card">
        <div className="insight gold">The bracket-ceiling rule: Convert up to — but never past — the top of your current bracket. Crossing into the next bracket raises the rate on every dollar above the line, not just the last one. This schedule avoids that cliff precisely.</div>
        <div className="insight green">Always pay conversion taxes from your taxable brokerage, not from the IRA itself. Using IRA funds is essentially a double tax event and reduces compounding inside the Roth.</div>
        <div className="insight">In years you have capital losses in your brokerage account, those losses offset conversion income dollar-for-dollar. You may be able to convert for free from a federal tax standpoint in those years.</div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Social Security
// ─────────────────────────────────────────────────────────────────────────────
function TabSocialSecurity({ a, state }: { a: ReturnType<typeof analyze>; state: SessionState }) {
  return (
    <>
      <div className="card">
        <div className="tag">Social Security optimizer</div>
        <div style={{ fontWeight: 500, marginBottom: '.5rem', color: '#666' }}>Your estimated monthly benefit based on when you claim</div>
        <p style={{ fontSize: 14, color: '#666', marginBottom: '1rem', lineHeight: 1.5 }}>
          Claiming early permanently reduces your benefit. Waiting gives you more every month for the rest of your life.
        </p>
        <div className="row3" style={{ gap: 10, marginBottom: '1rem' }}>
          {[
            { age: 62, val: a.ss62, lt: a.lt62, color: '#A32D2D', label: 'Claim at age 62', sub: '30% less than waiting to 67' },
            { age: 67, val: a.ss67, lt: a.lt67, color: '#185FA5', label: 'Claim at age 67 (full)', sub: 'Your full benefit amount' },
            { age: 70, val: a.ss70, lt: a.lt70, color: '#27500A', label: 'Claim at age 70', sub: '24% more than age 67' },
          ].map(({ age, val, lt, color, label, sub }) => (
            <div key={age} className={`ss-card ${a.ssRec === age ? 'recommended' : ''}`}>
              {a.ssRec === age && <div className="ss-badge">Recommended for you</div>}
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color }}>{fmt(val)}/mo</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 5, lineHeight: 1.4 }}>
                {sub}<br />Est. lifetime (to 90): {fmtK(lt)}
              </div>
            </div>
          ))}
        </div>
        <div className="metric-grid" style={{ marginBottom: 0 }}>
          <div className="metric-card"><div className="metric-label">Break-even: 62 vs. 67</div><div className="metric-value">Age {a.be6267}</div></div>
          <div className="metric-card"><div className="metric-label">Break-even: 67 vs. 70</div><div className="metric-value">Age {a.be6770}</div></div>
          <div className="metric-card"><div className="metric-label">Conversion window left</div><div className={`metric-value ${Math.max(0, 67 - state.age) > 4 ? 'good' : 'warn'}`}>{Math.max(0, 67 - state.age)} yrs</div></div>
        </div>
      </div>
      <div className="card">
        <div className="tag">Recommendation for you</div>
        <div style={{ fontWeight: 500, marginBottom: '.5rem' }}>Claim at age {a.ssRec === 'now' ? state.age : a.ssRec}</div>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: '1rem' }}>{a.ssRecReason}</p>
        <div className="insight gold">The overlooked connection: While you delay Social Security, your income is lower — which creates more room in your tax bracket to do Roth conversions at a lower rate. Delaying SS and converting aggressively in those same years is a powerful one-two combination most people miss entirely.</div>
        <div className="insight">Roth withdrawals don&apos;t count toward the formula the IRS uses to decide how much of your Social Security gets taxed. Traditional IRA withdrawals count fully. Every dollar shifted to Roth means less of your SS check gets taxed each year.</div>
        {state.spouseAge > 0 && (
          <div className="insight green">Spousal strategy: The higher-earning spouse should almost always delay to age 70. When one spouse passes away, the survivor keeps whichever benefit is larger — forever. Maximizing the higher earner&apos;s benefit is essentially lifetime income insurance for the surviving spouse.</div>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Pro Strategies
// ─────────────────────────────────────────────────────────────────────────────
function TabProStrategies({ a, state }: { a: ReturnType<typeof analyze>; state: SessionState }) {
  return (
    <div className="card">
      <div className="tag">Advanced strategies</div>
      <div className="insight gold">Net Unrealized Appreciation (NUA): If your 401(k) holds company stock with large gains, a special IRS rule lets you pay ordinary income tax only on the original cost, then long-term capital gains rates (usually 15%) on all appreciation. This can be far cheaper than converting those shares. Always check NUA before converting employer stock.</div>
      <div className="insight gold">Qualified Charitable Distributions (QCDs): Once you turn 70½, you can send up to $105,000/year directly from your IRA to any qualifying charity. That money counts toward your RMD but is excluded from your taxable income entirely — better than a deduction. If you give to charity, this is one of the highest-value tax moves in retirement.</div>
      <div className="insight">Social Security taxation: Up to 85% of your SS benefit becomes taxable if combined income exceeds $34,000 (single) or $44,000 (married). Lower RMDs through Roth conversion means less of your SS check gets taxed — a compounding benefit for life.</div>
      <div className="insight">Roth conversion ladder: Retiring before age 59½? Converting each year creates a 5-year runway. After 5 years, those specific converted dollars can be withdrawn penalty-free — building a tax-free income bridge before standard account access opens.</div>
      {a.heirFlag && <div className="insight green">Heir advantage: Heirs who inherit a Roth IRA must withdraw everything within 10 years — but pay zero taxes. A traditional IRA inherited the same way is fully taxable to them, often at their peak earning-years rate. Converting now could save your heirs tens of thousands.</div>}
      {a.medicareFlag && <div className="insight gold">IRMAA multi-year strategy: Medicare looks at your income from 2 years ago. Converting now temporarily raises income and may briefly raise premiums. But once Roth is built and RMDs drop, your premiums may decrease permanently — a long-term win that outweighs the short-term cost.</div>}
      {a.longTermCareFlag && <div className="insight red">Long-term care and Medicaid: In most states, traditional IRAs count against you for Medicaid eligibility. Roth IRAs may be treated differently depending on your state. If Medicaid planning is relevant, speak with an elder law attorney before making conversion decisions.</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: AI Advisor Chat
// ─────────────────────────────────────────────────────────────────────────────
const FOLLOW_UP_POOL = [
  'Can you explain bracket filling in plain English?',
  'Should I pay conversion taxes from my brokerage or my IRA?',
  'What is a QCD and should I be using one?',
  'How does the 5-year rule work for my conversions?',
  'What is IRMAA and how do I avoid those Medicare fees?',
  'How does my pension income affect my strategy?',
  'Should I convert more aggressively given my numbers?',
  'Can you give me a plain-English summary of my entire strategy?',
  'What is the pro-rata rule and does it affect me?',
  'What should I do first before I start converting?',
]

function AdvisorChat({ state, chatHistory, chatInitialized, onChatUpdate }: Props) {
  const [localHistory, setLocalHistory] = useState<ChatMessage[]>(chatHistory)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retryMsg, setRetryMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(chatInitialized)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [localHistory, isTyping, scrollToBottom])

  const getRandomSuggestions = () =>
    [...FOLLOW_UP_POOL].sort(() => Math.random() - 0.5).slice(0, 4)

  const sendMessage = useCallback(async (userText: string, history: ChatMessage[]) => {
    setIsTyping(true)
    setError(null)
    setRetryMsg(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, state }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      const reply: string = data.reply
      const newHistory: ChatMessage[] = [...history, { role: 'assistant', content: reply }]
      setLocalHistory(newHistory)
      onChatUpdate(newHistory, true)
      setSuggestions(getRandomSuggestions())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
      setRetryMsg(userText)
    } finally {
      setIsTyping(false)
    }
  }, [state, onChatUpdate])

  // Boot message on first open
  useEffect(() => {
    if (!initialized.current && localHistory.length === 0) {
      initialized.current = true
      setSuggestions(['Where do I start with Roth conversions?', 'How much should I convert this year?', 'When should I claim Social Security?', 'How do RMDs affect my taxes?'])
      sendMessage('', [])
    } else if (localHistory.length > 0 && suggestions.length === 0) {
      setSuggestions(getRandomSuggestions())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback((override?: string) => {
    const text = override ?? input.trim()
    if (!text || isTyping) return
    setInput('')
    setSuggestions([])
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newHistory = [...localHistory, userMsg]
    setLocalHistory(newHistory)
    sendMessage(text, newHistory)
  }, [input, isTyping, localHistory, sendMessage])

  const handleRetry = useCallback(() => {
    if (!retryMsg) return
    handleSend(retryMsg)
  }, [retryMsg, handleSend])

  const handleClear = useCallback(() => {
    initialized.current = false
    setLocalHistory([])
    setSuggestions([])
    setError(null)
    setRetryMsg(null)
    onChatUpdate([], false)
    setTimeout(() => {
      initialized.current = true
      sendMessage('', [])
    }, 50)
  }, [onChatUpdate, sendMessage])

  const a = analyze(state)

  return (
    <>
      <div className="profile-pill" style={{ background: '#E6F1FB', borderRadius: 10, padding: '.65rem 1rem', fontSize: 13, color: '#0C447C', marginBottom: '1rem', lineHeight: 1.5 }}>
        Profile loaded: Age {a.age} · {fmt(a.trad)} traditional · {a.margNow}% bracket now · {a.yearsToRMD} years to RMDs · SS est. {fmt(state.ssEarnings)}/mo
      </div>

      <div className="chat-wrap">
        {/* Header */}
        <div className="chat-header">
          <div className="advisor-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Your Roth Advisor</div>
            <div style={{ fontSize: 12, color: '#888' }}>AI-powered · Your full profile is pre-loaded</div>
          </div>
          <button className="btn btn-sm" onClick={handleClear} style={{ fontSize: 12 }}>Clear chat</button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {localHistory.map((msg, i) => (
            <div key={i} className={`chat-msg ${msg.role}`}>
              <div className="chat-msg-name">{msg.role === 'user' ? 'You' : 'Your Advisor'}</div>
              <div
                className="bubble"
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </div>
          ))}

          {isTyping && (
            <div className="chat-msg ai">
              <div className="chat-msg-name">Your Advisor</div>
              <div className="bubble">
                <div className="typing-dots"><span/><span/><span/></div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span>{error}</span>
              <button className="btn btn-sm" onClick={handleRetry}>Try again</button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !isTyping && (
          <div className="suggestions">
            {suggestions.map((q, i) => (
              <button key={i} className="suggestion-btn" onClick={() => { setSuggestions([]); handleSend(q); }}>
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
          <div className="chat-input-row">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything about your retirement plan..."
              rows={1}
              disabled={isTyping}
            />
            <button className="send-btn" onClick={() => handleSend()} disabled={isTyping || !input.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
