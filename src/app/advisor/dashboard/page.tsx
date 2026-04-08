'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdvisorClient } from '@/app/lib/advisor-clients'
import { getAdvisorClients, getAdvisorMetrics, addClientToAdvisor } from '@/app/lib/advisor-clients'

export default function AdvisorDashboardPage() {
  const router = useRouter()
  const [advisor, setAdvisor] = useState<{ id: string; full_name: string; email: string } | null>(null)
  const [clients, setClients] = useState<AdvisorClient[]>([])
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    totalTaxSavings: 0,
    avgConversionAmount: 0,
    conversionsCompleted: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    age: '',
    income: '',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const profileStr = localStorage.getItem('advisor_profile')
      if (!profileStr) {
        router.push('/advisor/login')
        return
      }

      const profile = JSON.parse(profileStr)
      setAdvisor(profile)

      // Load clients and metrics
      const clientsData = await getAdvisorClients(profile.id)
      setClients(clientsData)

      const metricsData = await getAdvisorMetrics(profile.id)
      setMetrics(metricsData)

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!advisor) return

    const result = await addClientToAdvisor(advisor.id, {
      name: newClientForm.name,
      email: newClientForm.email,
      age: newClientForm.age ? parseInt(newClientForm.age) : undefined,
      income: newClientForm.income ? parseInt(newClientForm.income) : undefined,
    })

    if (result.success) {
      // Refresh clients
      const updatedClients = await getAdvisorClients(advisor.id)
      setClients(updatedClients)
      setShowAddClient(false)
      setNewClientForm({ name: '', email: '', age: '', income: '' })

      // Update metrics
      const updatedMetrics = await getAdvisorMetrics(advisor.id)
      setMetrics(updatedMetrics)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('advisor_token')
    localStorage.removeItem('advisor_profile')
    router.push('/advisor/login')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
          <div>Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  if (!advisor) {
    return null
  }

  const statusColors: Record<string, string> = {
    new: '#60a5fa',
    analyzed: '#fbbf24',
    conversion_recommended: '#f97316',
    conversion_completed: '#22c55e',
  }

  const statusLabels: Record<string, string> = {
    new: 'New',
    analyzed: 'Analyzed',
    conversion_recommended: 'Rec. Conversion',
    conversion_completed: '✓ Completed',
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>
              Welcome, {advisor.full_name}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>{advisor.email}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowAddClient(true)}
              style={{
                padding: '10px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              + Add Client
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Add Client Modal */}
        {showAddClient && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
            onClick={() => setShowAddClient(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '450px',
                width: '100%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#1f2937' }}>
                Add New Client
              </h2>

              <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6b7280' }}>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6b7280' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6b7280' }}>
                      Age
                    </label>
                    <input
                      type="number"
                      value={newClientForm.age}
                      onChange={(e) => setNewClientForm({ ...newClientForm, age: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6b7280' }}>
                      Annual Income
                    </label>
                    <input
                      type="number"
                      value={newClientForm.income}
                      onChange={(e) => setNewClientForm({ ...newClientForm, income: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddClient(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#e5e7eb',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    Add Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div
            style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Clients
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>{metrics.totalClients}</div>
          </div>

          <div
            style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Tax Savings
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>
              ${(metrics.totalTaxSavings / 1000).toFixed(1)}k
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
              Avg Conversion
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>
              ${(metrics.avgConversionAmount / 1000).toFixed(0)}k
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
              Conversions Completed
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#22c55e' }}>{metrics.conversionsCompleted}</div>
          </div>
        </div>

        {/* Clients Table */}
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
            Your Clients ({clients.length})
          </h2>

          {clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
              <p>No clients yet. Add your first client to get started!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Client Name
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Email
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Age
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Recommended Conv.
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Est. Tax Savings
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Status
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Last Analysis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>
                        {client.client_name}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{client.client_email}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{client.age || '—'}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>
                        {client.recommended_conversion ? `$${(client.recommended_conversion / 1000).toFixed(0)}k` : '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>
                        {client.estimated_tax_savings ? `$${(client.estimated_tax_savings / 1000).toFixed(0)}k` : '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: statusColors[client.status],
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {statusLabels[client.status]}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                        {client.last_analysis_at
                          ? new Date(client.last_analysis_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
