import { computeDashboardMetrics } from '@/app/lib/dashboard-metrics'
import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authentication: Require admin password as query param
    // In production, use proper auth (Supabase auth token, JWT, etc.)
    const adminPassword = request.nextUrl.searchParams.get('admin_key')
    const expectedKey = process.env.DASHBOARD_ADMIN_KEY

    // If admin key not configured, deny access
    if (!expectedKey) {
      return NextResponse.json(
        { error: 'Dashboard not configured' },
        { status: 403 }
      )
    }

    // Validate admin key
    if (!adminPassword || adminPassword !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const metrics = await computeDashboardMetrics()
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Failed to compute dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
