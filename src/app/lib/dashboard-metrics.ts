/**
 * Analytics Aggregation & Query Service
 * Real-time metrics computation for dashboard
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export interface DashboardMetrics {
  today: {
    sessions: number
    events: number
    conversions: number
    conversionRate: number
  }
  weekly: {
    sessions: number
    events: number
    conversions: number
    conversionRate: number
  }
  monthly: {
    sessions: number
    events: number
    conversions: number
    conversionRate: number
  }
  byFeature: {
    scenarioComparison: number
    advisorEmail: number
    emailCapture: number
    shareLink: number
    pdfExport: number
    cpaModal: number
  }
  conversionFunnel: {
    stage: string
    count: number
    conversionRate: number
  }[]
  topEvents: Array<{
    event: string
    count: number
    percentage: number
  }>
}

/**
 * Get unique session count for date range
 */
async function getSessionCount(days: number): Promise<number> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('analytics_events')
    .select('session_id', { count: 'exact', head: false })
    .gte('created_at', startDate.toISOString())

  if (error) {
    console.error('Session count error:', error)
    return 0
  }

  // Count unique sessions
  const uniqueSessions = new Set((data || []).map((e: any) => e.session_id))
  return uniqueSessions.size
}

/**
 * Get event count for date range
 */
async function getEventCount(days: number): Promise<number> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { count, error } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())

  if (error) {
    console.error('Event count error:', error)
    return 0
  }

  return count || 0
}

/**
 * Get conversion count (advisoremail, share link, email capture, pdf export)
 */
async function getConversionCount(days: number): Promise<number> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { count, error } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())
    .eq('event_type', 'conversion')

  if (error) {
    console.error('Conversion count error:', error)
    return 0
  }

  return count || 0
}

/**
 * Get feature usage breakdown
 */
async function getFeatureUsage(days: number): Promise<Record<string, number>> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('analytics_events')
    .select('category')
    .gte('created_at', startDate.toISOString())
    .in('category', [
      'scenario_comparison',
      'advisor_email',
      'email_capture',
      'share_link',
      'pdf_export',
      'cpa_modal',
    ])

  if (error) {
    console.error('Feature usage error:', error)
    return {}
  }

  const usage: Record<string, number> = {
    scenarioComparison: 0,
    advisorEmail: 0,
    emailCapture: 0,
    shareLink: 0,
    pdfExport: 0,
    cpaModal: 0,
  }

  ;(data || []).forEach((event: any) => {
    if (event.category === 'scenario_comparison') usage.scenarioComparison++
    if (event.category === 'advisor_email') usage.advisorEmail++
    if (event.category === 'email_capture') usage.emailCapture++
    if (event.category === 'share_link') usage.shareLink++
    if (event.category === 'pdf_export') usage.pdfExport++
    if (event.category === 'cpa_modal') usage.cpaModal++
  })

  return usage
}

/**
 * Get conversion funnel stages
 */
async function getConversionFunnel(days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const stages = [
    { name: 'Results Page', event: 'engagement', category: 'other' },
    { name: 'Email Captured', event: 'conversion', category: 'email_capture' },
    { name: 'Advisor Email Sent', event: 'conversion', category: 'advisor_email' },
    { name: 'Share Link Opened', event: 'conversion', category: 'share_link' },
    { name: 'CPA Review Viewed', event: 'engagement', category: 'cpa_modal' },
  ]

  const funnel = await Promise.all(
    stages.map(async (stage) => {
      const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .eq('event_type', stage.event)
        .eq('category', stage.category)

      return { stage: stage.name, count: count || 0 }
    })
  )

  // Calculate conversion rates
  const total = funnel[0]?.count || 1
  return funnel.map((stage, idx) => ({
    ...stage,
    conversionRate: idx === 0 ? 100 : (stage.count / total) * 100,
  }))
}

/**
 * Get top events by frequency
 */
async function getTopEvents(days: number, limit: number = 10) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_name')
    .gte('created_at', startDate.toISOString())

  if (error) {
    console.error('Top events error:', error)
    return []
  }

  // Count events
  const eventCounts: Record<string, number> = {}
  ;(data || []).forEach((e: any) => {
    eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1
  })

  const total = Object.values(eventCounts).reduce((a, b) => a + b, 0)

  // Sort and limit
  return Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([event, count]) => ({
      event,
      count,
      percentage: Number(((count / total) * 100).toFixed(1)),
    }))
}

/**
 * Compute all dashboard metrics
 */
export async function computeDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    todaySessions,
    weeklySessions,
    monthlySessions,
    todayEvents,
    weeklyEvents,
    monthlyEvents,
    todayConversions,
    weeklyConversions,
    monthlyConversions,
    featureUsage,
    conversionFunnel,
    topEvents,
  ] = await Promise.all([
    getSessionCount(1),
    getSessionCount(7),
    getSessionCount(30),
    getEventCount(1),
    getEventCount(7),
    getEventCount(30),
    getConversionCount(1),
    getConversionCount(7),
    getConversionCount(30),
    getFeatureUsage(30),
    getConversionFunnel(30),
    getTopEvents(30),
  ])

  return {
    today: {
      sessions: todaySessions,
      events: todayEvents,
      conversions: todayConversions,
      conversionRate: todaySessions > 0 ? (todayConversions / todaySessions) * 100 : 0,
    },
    weekly: {
      sessions: weeklySessions,
      events: weeklyEvents,
      conversions: weeklyConversions,
      conversionRate: weeklySessions > 0 ? (weeklyConversions / weeklySessions) * 100 : 0,
    },
    monthly: {
      sessions: monthlySessions,
      events: monthlyEvents,
      conversions: monthlyConversions,
      conversionRate: monthlySessions > 0 ? (monthlyConversions / monthlySessions) * 100 : 0,
    },
    byFeature: {
      scenarioComparison: featureUsage.scenarioComparison || 0,
      advisorEmail: featureUsage.advisorEmail || 0,
      emailCapture: featureUsage.emailCapture || 0,
      shareLink: featureUsage.shareLink || 0,
      pdfExport: featureUsage.pdfExport || 0,
      cpaModal: featureUsage.cpaModal || 0,
    },
    conversionFunnel,
    topEvents,
  }
}
