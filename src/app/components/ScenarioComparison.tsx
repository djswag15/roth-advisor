'use client'

import { useState } from 'react'
import type { SessionState } from '@/app/lib/engine'
import { analyze, fmt, fmtK } from '@/app/lib/engine'
import { getComparisonMetrics } from '@/app/lib/scenarios'

interface ScenarioComparisonProps {
  state: SessionState
}

export default function ScenarioComparison({ state }: ScenarioComparisonProps) {
  const [scenarioAmount, setScenarioAmount] = useState(state.conversionAmount * 1.5)
  const primaryAnalysis = analyze(state)
  const comparisonState = { ...state, conversionAmount: scenarioAmount }
  const comparisonAnalysis = analyze(comparisonState)

  const metrics = getComparisonMetrics(primaryAnalysis, comparisonAnalysis)

  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`
  const getChange = (val1: number, val2: number) => {
    const change = val2 - val1
    if (Math.abs(change) < 1) return 'same'
    return change > 0 ? `+${fmt(change)}` : fmt(change)
  }
  const getBadge = (val1: number, val2: number) => {
    const change = val2 - val1
    if (Math.abs(change) < 1) return 'same'
    return change > val1 * 0.1 ? 'up' : change < -val1 * 0.1 ? 'down' : 'same'
  }

  return (
    <div className="card">
      <div className="tag">Scenario comparison</div>
      <div style={{ fontWeight: 500, marginBottom: '1rem', color: '#1f2937' }}>
        See how different conversion amounts impact your retirement
      </div>

      {/* Scenario Input */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
            Scenario 1: Current Plan
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
            {fmt(state.conversionAmount)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Annual conversion
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
            Scenario 2: What if?
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max={state.trad}
              step="10000"
              value={scenarioAmount}
              onChange={(e) => setScenarioAmount(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Drag to adjust: {fmt(scenarioAmount)}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ 
        overflowX: 'auto',
        marginBottom: '24px'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600, color: '#1f2937', backgroundColor: '#f9fafb' }}>Metric</th>
              <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, color: '#1f2937', backgroundColor: '#f0fdf4' }}>Scenario 1</th>
              <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, color: '#1f2937', backgroundColor: '#fef3c7' }}>Scenario 2</th>
              <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600, color: '#666', backgroundColor: '#f3f4f6' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, idx) => {
              const isPercent = row.metric.includes('bracket')
              const val1 = isPercent ? formatPercent(row.s1) : fmt(row.s1)
              const val2 = isPercent ? formatPercent(row.s2) : fmt(row.s2)
              const change = getChange(row.s1, row.s2)
              const badge = getBadge(row.s1, row.s2)

              return (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white'
                  }}
                >
                  <td style={{ padding: '12px', color: '#6b7280', fontWeight: 500 }}>{row.metric}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: 500 }}>{val1}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: 500 }}>{val2}</td>
                  <td style={{ 
                    padding: '12px', 
                    textAlign: 'center',
                    color: badge === 'up' ? '#dc2626' : badge === 'down' ? '#059669' : '#6b7280',
                    fontWeight: 500
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: badge === 'up' ? '#fee2e2' : badge === 'down' ? '#dcfce7' : '#f3f4f6',
                      fontSize: '12px'
                    }}>
                      {badge === 'up' ? '↑ ' : badge === 'down' ? '↓ ' : ''}{change}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Key Insights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: comparisonAnalysis.taxDelta > primaryAnalysis.taxDelta ? '#dcfce7' : '#fee2e2',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', color: '#1f2937' }}>
            {comparisonAnalysis.taxDelta > primaryAnalysis.taxDelta ? '✓ Better' : '⚠ Caution'}
          </div>
          <div style={{ color: '#6b7280' }}>
            Scenario 2 saves {comparisonAnalysis.taxDelta > primaryAnalysis.taxDelta ? 'more' : 'less'} in taxes over retirement
          </div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: comparisonAnalysis.rmdEst < primaryAnalysis.rmdEst ? '#dcfce7' : '#fee2e2',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', color: '#1f2937' }}>
            {comparisonAnalysis.rmdEst < primaryAnalysis.rmdEst ? '✓ Lower RMD' : '⚠ Higher RMD'}
          </div>
          <div style={{ color: '#6b7280' }}>
            Est. annual RMD: {fmt(comparisonAnalysis.rmdEst)} {comparisonAnalysis.rmdEst < primaryAnalysis.rmdEst ? '(better)' : '(higher)'}
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: '#f0f9ff',
        borderRadius: '6px',
        borderLeft: '3px solid #0ea5e9',
        fontSize: '12px',
        color: '#0c4a6e'
      }}>
        💡 <strong>Tip:</strong> Compare scenarios to find the sweet spot between current taxes and future RMDs. There's rarely a one-size-fits-all answer.
      </div>
    </div>
  )
}
