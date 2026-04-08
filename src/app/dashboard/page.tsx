'use client'

import { useState, useEffect } from 'react'
import type { DashboardMetrics } from '@/app/lib/dashboard-metrics'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchMetrics = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/dashboard/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
          <div>Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#dc2626' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <div>{error || 'Failed to load metrics'}</div>
        </div>
      </div>
    )
  }

  const MetricCard = ({ label, value, trend }: { label: string; value: string | number; trend?: string }) => (
    <div
      style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>{value}</div>
      {trend && <div style={{ fontSize: '12px', color: '#6b7280' }}>{trend}</div>}
    </div>
  )

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>NestWise Analytics</h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Real-time product metrics & insights</p>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
              fontSize: '14px',
            }}
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Time Period Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
          {['Today', 'This Week', 'This Month'].map((period) => (
            <button
              key={period}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '2px solid #2563eb',
                color: '#1f2937',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {period}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
          <MetricCard
            label="Sessions (Today)"
            value={metrics.today.sessions}
            trend={`${((metrics.today.sessions / (metrics.weekly.sessions / 7 || 1)) * 100).toFixed(0)}% vs avg`}
          />
          <MetricCard
            label="Events (Today)"
            value={metrics.today.events}
            trend={`${metrics.today.events > 0 ? '+' : ''}${((metrics.today.events / (metrics.weekly.events / 7 || 1) - 1) * 100).toFixed(0)}% vs avg`}
          />
          <MetricCard
            label="Conversions (Today)"
            value={metrics.today.conversions}
            trend={metrics.today.conversions > 0 ? '🎯' : 'No conversions yet'}
          />
          <MetricCard
            label="Conversion Rate (Today)"
            value={`${metrics.today.conversionRate.toFixed(1)}%`}
            trend={`vs ${metrics.weekly.conversionRate.toFixed(1)}% weekly`}
          />
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
          {/* Feature Usage */}
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Feature Usage (30 days)</h2>
            <div>
              {[
                { label: 'Scenario Comparison', value: metrics.byFeature.scenarioComparison, icon: '📊' },
                { label: 'Advisor Email', value: metrics.byFeature.advisorEmail, icon: '📧' },
                { label: 'Email Capture', value: metrics.byFeature.emailCapture, icon: '✉️' },
                { label: 'Share Link', value: metrics.byFeature.shareLink, icon: '🔗' },
                { label: 'PDF Export', value: metrics.byFeature.pdfExport, icon: '📥' },
                { label: 'CPA Modal', value: metrics.byFeature.cpaModal, icon: '⚠️' },
              ].map((feature) => (
                <div
                  key={feature.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{feature.icon}</span>
                    <span style={{ fontSize: '14px', color: '#374151' }}>{feature.label}</span>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>{feature.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Conversion Funnel (30 days)</h2>
            <div>
              {metrics.conversionFunnel.map((stage, idx) => (
                <div key={stage.stage} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{stage.stage}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      {stage.count} users • {stage.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${stage.conversionRate}%`,
                        height: '100%',
                        backgroundColor: idx === 0 ? '#2563eb' : idx < 3 ? '#3b82f6' : '#60a5fa',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Events */}
        <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Top Events (30 days)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    Event
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    Count
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.topEvents.map((event) => (
                  <tr key={event.event} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#1f2937' }}>{event.event}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                      {event.count}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '14px', color: '#6b7280' }}>
                      {event.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
          Last updated: {new Date().toLocaleTimeString()} | Auto-refreshes every 30 seconds
        </div>
      </div>
    </div>
  )
}
