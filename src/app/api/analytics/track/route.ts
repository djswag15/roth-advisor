import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Rate limiting for analytics (prevent spam/pollution)
const analyticsRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const ANALYTICS_RATE_LIMIT = 100 // events per minute
const ANALYTICS_RATE_WINDOW = 60_000

function isAnalyticsRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = analyticsRateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    analyticsRateLimitMap.set(ip, { count: 1, resetAt: now + ANALYTICS_RATE_WINDOW })
    return false
  }
  record.count++
  return record.count > ANALYTICS_RATE_LIMIT
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return typeof uuid === 'string' && uuidRegex.test(uuid)
}

// Sanitize metadata to prevent injection
function sanitizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {}
  const obj = metadata as Record<string, unknown>
  const sanitized: Record<string, unknown> = {}
  
  // Only allow safe primitive types and arrays of primitives
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length < 500) {
      sanitized[key] = value
    } else if (typeof value === 'number') {
      sanitized[key] = value
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    }
  }
  return sanitized
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (isAnalyticsRateLimited(ip)) {
      // Don't break the app, just silently fail
      return NextResponse.json({ success: false }, { status: 429 })
    }

    const body = await request.json()

    const {
      session_id,
      event_type,
      event_name,
      category,
      value,
      metadata,
      page_url,
      referrer,
      user_agent,
    } = body

    // Validate required fields
    if (!session_id || !event_type || !event_name || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate session_id is UUID format
    if (!isValidUUID(session_id)) {
      return NextResponse.json({ error: 'Invalid session_id format' }, { status: 400 })
    }

    // Validate string lengths to prevent DoS
    if (
      typeof event_type !== 'string' ||
      event_type.length > 100 ||
      typeof event_name !== 'string' ||
      event_name.length > 100 ||
      typeof category !== 'string' ||
      category.length > 100
    ) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 })
    }

    // Sanitize metadata
    const safeMetadata = sanitizeMetadata(metadata)

    // Save event to analytics_events table
    const { data, error } = await supabase.from('analytics_events').insert({
      session_id,
      event_type,
      event_name,
      category,
      value: typeof value === 'number' ? value : null,
      metadata: safeMetadata,
      page_url: typeof page_url === 'string' ? page_url.slice(0, 500) : null,
      referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null,
      user_agent: typeof user_agent === 'string' ? user_agent.slice(0, 500) : null,
    })

    if (error) {
      console.error('Analytics insert error:', error)
      // Don't fail - analytics shouldn't break the app
      return NextResponse.json({ success: false }, { status: 500 })
    }

    // Update feature usage tracking (for conversion funnels)
    if (event_type === 'conversion' || event_type === 'engagement') {
      await supabase
        .from('analytics_feature_usage')
        .upsert(
          {
            feature_name: category,
            session_id,
            event_count: 1,
            last_used_at: new Date().toISOString(),
            metadata: safeMetadata,
          },
          { onConflict: 'feature_name,session_id' }
        )
        .then(({ data: updateData, error: updateError }) => {
          if (updateError) {
            console.debug('Feature usage update skipped:', updateError.message)
          }
        })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Analytics endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
