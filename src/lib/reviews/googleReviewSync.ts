// ====================================================================
// CLIENTLOOP GOOGLE REVIEW LINK & SYNC BOUNDARY SERVICE
// Manages Verified Review URLs, Click Tracking & Google API Boundaries
// Strict Compliance: No Review Gating, No Incentives, Honest Attribution
// ====================================================================

import { store } from '../services/store'

export interface GoogleReviewConfig {
  verifiedReviewUrl: string | null
  isConfigured: boolean
  syncStatus: 'not_connected' | 'connected' | 'credentials_missing'
  manualReviewCount: number | null
  manualCountUpdatedAt: string | null
  manualCountUpdatedBy: string | null
  notes: string
}

export class GoogleReviewSyncService {
  /**
   * Validates that a Google Review URL is a valid HTTPS Google domain
   * Supported patterns:
   * - https://g.page/r/...
   * - https://maps.app.goo.gl/...
   * - https://search.google.com/local/writereview?placeid=...
   * - https://maps.google.com/?cid=...
   */
  validateGoogleReviewUrl(url: string): { isValid: boolean; normalizedUrl?: string; error?: string } {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'Review URL cannot be empty' }
    }

    const trimmed = url.trim()
    if (!trimmed.startsWith('https://')) {
      return { isValid: false, error: 'Review URL must use secure HTTPS protocol' }
    }

    try {
      const parsed = new URL(trimmed)
      const allowedHosts = [
        'g.page',
        'maps.app.goo.gl',
        'search.google.com',
        'maps.google.com',
        'google.com',
        'www.google.com'
      ]

      const isGoogleHost = allowedHosts.some(host => 
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
      )

      if (!isGoogleHost) {
        return { 
          isValid: false, 
          error: `URL domain '${parsed.hostname}' is not a recognized Google Maps / Review domain` 
        }
      }

      return { isValid: true, normalizedUrl: trimmed }
    } catch {
      return { isValid: false, error: 'Malformed URL format' }
    }
  }

  /**
   * Retrieves Google Review configuration & integration status for a workspace
   */
  getReviewConfig(businessId: string): GoogleReviewConfig {
    const business = store.getBusinessById(businessId)

    const verifiedUrl = business?.google_review_url || null
    const hasUrl = !!verifiedUrl

    return {
      verifiedReviewUrl: verifiedUrl,
      isConfigured: hasUrl,
      syncStatus: 'not_connected', // In sandbox/mock, API sync is not connected
      manualReviewCount: null,
      manualCountUpdatedAt: null,
      manualCountUpdatedBy: null,
      notes: hasUrl
        ? 'Verified Google Review URL configured. Outbound clicks are tracked separately from verified posted reviews.'
        : 'No Google Review URL configured yet for this business workspace.'
    }
  }

  /**
   * Saves or updates the verified Google Review URL for a business workspace
   */
  setVerifiedReviewUrl(
    businessId: string, 
    url: string,
    actorUserId: string = 'system_user'
  ): { success: boolean; error?: string } {
    const validation = this.validateGoogleReviewUrl(url)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    store.updateBusinessSettings(businessId, {
      google_review_url: validation.normalizedUrl
    })

    store.recordAuditEvent(businessId, actorUserId, 'set_google_review_url', 'business_settings', {
      url: validation.normalizedUrl
    })

    return { success: true }
  }

  /**
   * Returns verification metrics and breakdown
   */
  getReviewMetricsSummary(businessId: string): {
    invitationsShown: number
    outboundClicks: number
    clickThroughRate: number
    syncedReviews: number
    syncStatusLabel: string
    complianceBadge: string
  } {
    const activities = store.getReviewActivities(businessId)

    const invitationsShown = activities.filter(a => a.event_type === 'invitation_shown').length
    const outboundClicks = activities.filter(a => a.event_type === 'link_clicked').length
    const syncedReviews = activities.filter(a => a.event_type === 'synced_review').length

    const clickThroughRate = invitationsShown > 0
      ? Math.round((outboundClicks / invitationsShown) * 100)
      : 0

    return {
      invitationsShown,
      outboundClicks,
      clickThroughRate,
      syncedReviews,
      syncStatusLabel: 'Sync Not Connected (API credentials required)',
      complianceBadge: '100% Policy Compliant • Zero Review Gating'
    }
  }
}

// Global Singleton Instance
export const googleReviewSync = new GoogleReviewSyncService()
