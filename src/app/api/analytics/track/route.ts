import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
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

    // Save event to analytics_events table
    const { data, error } = await supabase.from('analytics_events').insert({
      session_id,
      event_type,
      event_name,
      category,
      value: value || null,
      metadata: metadata || {},
      page_url,
      referrer,
      user_agent,
    })

    if (error) {
      console.error('Analytics insert error:', error)
      // Don't fail - analytics shouldn't break the app
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
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
            metadata: metadata || {},
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
