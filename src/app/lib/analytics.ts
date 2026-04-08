/**
 * Analytics Tracking Library
 * Tracks user interactions: feature usage, conversions, engagement
 */

export type EventType = 'engagement' | 'conversion' | 'error' | 'milestone'
export type EventCategory =
  | 'scenario_comparison'
  | 'advisor_email'
  | 'share_link'
  | 'pdf_export'
  | 'legal_modal'
  | 'cpa_modal'
  | 'email_capture'
  | 'chat'
  | 'navigation'
  | 'other'

export interface AnalyticsEvent {
  event_type: EventType
  event_name: string
  category: EventCategory
  value?: number
  metadata?: Record<string, any>
}

export interface PageContext {
  page_url?: string
  referrer?: string
  user_agent?: string
  session_id?: string
}

class AnalyticsTracker {
  private sessionId: string | null = null
  private apiEndpoint = '/api/analytics/track'
  private pageContext: PageContext = {}

  constructor() {
    // Initialize on client side
    if (typeof window !== 'undefined') {
      this.initSession()
      this.setupPageContext()
    }
  }

  /**
   * Initialize or retrieve session ID
   */
  private initSession() {
    // Check localStorage for existing session
    const stored = localStorage.getItem('analytics_session_id')
    if (stored) {
      this.sessionId = stored
    } else {
      // Generate new UUID
      this.sessionId = this.generateUuid()
      localStorage.setItem('analytics_session_id', this.sessionId)
    }
  }

  /**
   * Setup page context (URL, referrer, user agent)
   */
  private setupPageContext() {
    if (typeof window === 'undefined') return

    this.pageContext = {
      page_url: window.location.href,
      referrer: document.referrer || undefined,
      user_agent: navigator.userAgent,
      session_id: this.sessionId || undefined,
    }
  }

  /**
   * Generate UUID v4
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Track an event (async, doesn't block UI)
   */
  async track(event: AnalyticsEvent, customContext?: PageContext) {
    if (typeof window === 'undefined') return // SSR guard

    const context = { ...this.pageContext, ...customContext }

    const payload = {
      session_id: this.sessionId,
      event_type: event.event_type,
      event_name: event.event_name,
      category: event.category,
      value: event.value,
      metadata: event.metadata,
      page_url: context.page_url,
      referrer: context.referrer,
      user_agent: context.user_agent,
    }

    try {
      // Non-blocking: send in background
      fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true, // Survive page navigation
      }).catch(() => {
        // Silently fail - don't break user experience
      })
    } catch (err) {
      console.debug('Analytics track error:', err)
    }
  }

  /**
   * Track feature engagement
   */
  trackFeatureUsage(featureName: EventCategory, action: string, metadata?: any) {
    this.track({
      event_type: 'engagement',
      event_name: `${featureName}_${action}`,
      category: featureName,
      metadata,
    })
  }

  /**
   * Track conversions (advisor email sent, share link clicked, etc.)
   */
  trackConversion(conversionType: string, value?: number, metadata?: any) {
    this.track({
      event_type: 'conversion',
      event_name: conversionType,
      category: 'other',
      value,
      metadata,
    })
  }

  /**
   * Track errors
   */
  trackError(errorName: string, metadata?: any) {
    this.track({
      event_type: 'error',
      event_name: errorName,
      category: 'other',
      metadata,
    })
  }

  /**
   * Track milestones (e.g., completed analysis)
   */
  trackMilestone(milestoneName: string, metadata?: any) {
    this.track({
      event_type: 'milestone',
      event_name: milestoneName,
      category: 'other',
      metadata,
    })
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Identify a session with email (for email capture)
   */
  identifySession(email: string, metadata?: any) {
    if (!this.sessionId) return

    // Update metadata to link email to session
    this.track({
      event_type: 'engagement',
      event_name: 'session_identified',
      category: 'email_capture',
      metadata: { email, ...metadata },
    })

    // Also store locally for reference
    sessionStorage.setItem('analytics_user_email', email)
  }
}

// Export singleton instance
export const analytics = new AnalyticsTracker()
