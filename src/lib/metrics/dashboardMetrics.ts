// ====================================================================
// CLIENTLOOP TENANT-SCOPED DASHBOARD & METRICS ENGINE
// Calculates Reconciled Metrics with Timezone Boundaries (Africa/Lagos, etc.)
// Never equates review link clicks with posted Google reviews
// ====================================================================

import { store } from '../services/store'
import { whatsappQueue } from '../messaging/messageQueue'

export type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'all_time'

export interface DashboardFilterOptions {
  preset: DateRangePreset
  customStartDate?: string
  customEndDate?: string
}

export interface DashboardMetricsResult {
  businessId: string
  timezone: string
  dateRange: {
    preset: DateRangePreset
    startDate: string
    endDate: string
  }
  // Core Operational KPIs
  totalVisits: number
  uniqueCustomers: number
  newCustomers: number
  returningCustomers: number
  repeatCustomerRate: number // percentage 0-100

  // Questionnaire Completion
  questionnairesSent: number
  questionnairesCompleted: number
  questionnaireCompletionRate: number // percentage 0-100

  // Review Flow Metrics (Honest Separation: Invitations vs Outbound Clicks vs Verified Synced)
  reviewInvitationsDisplayed: number
  reviewLinkClicks: number
  reviewClickThroughRate: number // percentage 0-100
  googleReviewSyncStatus: {
    isConnected: boolean
    connectionLabel: string
    lastSyncedAt: string | null
    manualReviewCount: number | null
    attributionNotice: string
  }

  // Distribution breakdowns
  servicesBreakdown: { name: string; count: number; percentage: number }[]
  acquisitionSources: { source: string; count: number; percentage: number }[]
  messageDeliveryStats: {
    queued: number
    sent: number
    delivered: number
    read: number
    suppressed: number
    failed: number
  }
}

/**
 * Returns [startIso, endIso] for a given preset in the business's timezone
 */
export function calculateDateRangeBounds(
  preset: DateRangePreset,
  timezone: string = 'Africa/Lagos',
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date()

  // Format parts in target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  
  // yyyy-mm-dd in local timezone
  const localDateStr = formatter.format(now)
  const [yearStr, monthStr, dayStr] = localDateStr.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)

  if (preset === 'today') {
    const start = new Date(Date.UTC(year, month, day, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    return { startDate: start.toISOString(), endDate: end.toISOString() }
  }

  if (preset === 'this_week') {
    // Current day of week (0 = Sunday)
    const dayOfWeek = now.getUTCDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const start = new Date(Date.UTC(year, month, day + diffToMonday, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    return { startDate: start.toISOString(), endDate: end.toISOString() }
  }

  if (preset === 'this_month') {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    return { startDate: start.toISOString(), endDate: end.toISOString() }
  }

  if (preset === 'last_30_days') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { startDate: start.toISOString(), endDate: now.toISOString() }
  }

  if (preset === 'all_time') {
    return {
      startDate: new Date('2025-01-01T00:00:00Z').toISOString(),
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  return {
    startDate: customStart || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: customEnd || now.toISOString()
  }
}

/**
 * Computes strictly tenant-scoped metrics for a business
 */
export function calculateDashboardMetrics(
  businessId: string,
  filter: DashboardFilterOptions = { preset: 'last_30_days' }
): DashboardMetricsResult {
  const business = store.getBusinessById(businessId)
  const timezone = business?.timezone || 'Africa/Lagos'

  const { startDate, endDate } = calculateDateRangeBounds(
    filter.preset,
    timezone,
    filter.customStartDate,
    filter.customEndDate
  )

  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()

  // 1. Fetch raw tenant data
  const allVisits = store.getVisitsByBusiness(businessId)
  const allCustomers = store.getCustomersByBusiness(businessId)
  const allSubmissions = store.getSubmissionsByBusiness(businessId)
  const allReviewEvents = store.getReviewActivities(businessId)
  const allMessages = [
    ...whatsappQueue.getMessagesByBusiness(businessId),
    // Fallback in case store has legacy seeded messages
  ]

  // Filter visits within date boundary
  const filteredVisits = allVisits.filter(v => {
    const t = new Date(v.visit_timestamp || v.created_at).getTime()
    return t >= startTime && t <= endTime
  })

  // 2. Metrics: Visits & Customers
  const totalVisits = filteredVisits.length

  const visitedCustomerIds = new Set(filteredVisits.map(v => v.customer_id))
  const uniqueCustomers = visitedCustomerIds.size

  // Calculate new vs returning clients using visit history
  let newCustomers = 0
  let returningCustomers = 0

  for (const visit of filteredVisits) {
    // A customer is new on their very first visit ever in this business
    const customerVisits = allVisits
      .filter(v => v.customer_id === visit.customer_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    if (customerVisits[0]?.id === visit.id) {
      newCustomers++
    } else {
      returningCustomers++
    }
  }

  const repeatCustomerRate = totalVisits > 0 
    ? Math.round((returningCustomers / totalVisits) * 100) 
    : 0

  // 3. Questionnaire Metrics
  const questionnairesSent = filteredVisits.filter(v => 
    v.questionnaire_status === 'sent' || v.questionnaire_status === 'submitted'
  ).length

  const visitIdsInRange = new Set(filteredVisits.map(v => v.id))
  const questionnairesCompleted = allSubmissions.filter(s => 
    visitIdsInRange.has(s.visit_id)
  ).length

  const questionnaireCompletionRate = questionnairesSent > 0
    ? Math.round((questionnairesCompleted / questionnairesSent) * 100)
    : 0

  // 4. Review Invitations vs Outbound Clicks
  const reviewEventsInRange = allReviewEvents.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t >= startTime && t <= endTime
  })

  const reviewInvitationsDisplayed = reviewEventsInRange.filter(
    r => r.event_type === 'invitation_shown'
  ).length

  const reviewLinkClicks = reviewEventsInRange.filter(
    r => r.event_type === 'link_clicked'
  ).length

  const reviewClickThroughRate = reviewInvitationsDisplayed > 0
    ? Math.round((reviewLinkClicks / reviewInvitationsDisplayed) * 100)
    : 0

  // 5. Service Breakdown
  const serviceCounts: Record<string, number> = {}
  for (const v of filteredVisits) {
    const sName = v.service || 'Standard Service'
    serviceCounts[sName] = (serviceCounts[sName] || 0) + 1
  }

  const servicesBreakdown = Object.entries(serviceCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)

  // 6. Acquisition Source Breakdown (from customers or submissions)
  const sourceCounts: Record<string, number> = {}
  for (const cust of allCustomers) {
    if (visitedCustomerIds.has(cust.id) && cust.first_discovery_source) {
      const src = cust.first_discovery_source
      sourceCounts[src] = (sourceCounts[src] || 0) + 1
    }
  }

  const totalSourcesCount = Object.values(sourceCounts).reduce((acc, c) => acc + c, 0)
  const acquisitionSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalSourcesCount > 0 ? Math.round((count / totalSourcesCount) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)

  // 7. Message Delivery Stats
  const messageDeliveryStats = {
    queued: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    suppressed: 0,
    failed: 0
  }

  for (const msg of allMessages) {
    const t = new Date(msg.created_at).getTime()
    if (t >= startTime && t <= endTime && msg.business_id === businessId) {
      if (msg.status in messageDeliveryStats) {
        messageDeliveryStats[msg.status]++
      }
    }
  }

  return {
    businessId,
    timezone,
    dateRange: {
      preset: filter.preset,
      startDate,
      endDate
    },
    totalVisits,
    uniqueCustomers,
    newCustomers,
    returningCustomers,
    repeatCustomerRate,
    questionnairesSent,
    questionnairesCompleted,
    questionnaireCompletionRate,
    reviewInvitationsDisplayed,
    reviewLinkClicks,
    reviewClickThroughRate,
    googleReviewSyncStatus: {
      isConnected: false,
      connectionLabel: 'Not Connected',
      lastSyncedAt: null,
      manualReviewCount: null,
      attributionNotice: 'ClientLoop tracks outbound review-link clicks. Unsynced external reviews are not claimed without Google Business Profile API connection.'
    },
    servicesBreakdown,
    acquisitionSources,
    messageDeliveryStats
  }
}
