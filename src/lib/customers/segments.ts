// ====================================================================
// CLIENTLOOP CUSTOMER SEGMENTATION & PROFILE ANALYTICS ENGINE
// Transparent Rule-Based Classification (No Unsupported Churn Speculation)
// ====================================================================

import { Customer, Visit, QuestionnaireSubmission } from '../types/database'

export type CustomerSegment = 'new' | 'returning' | 'frequent' | 'lapsed'

export interface CustomerSegmentConfig {
  frequentVisitThreshold: number // Default 3 visits
  lapsedDaysThreshold: number // Default 45 days without visit
  newWindowDays: number // Default 30 days since first visit
}

export const DEFAULT_SEGMENT_CONFIG: CustomerSegmentConfig = {
  frequentVisitThreshold: 3,
  lapsedDaysThreshold: 45,
  newWindowDays: 30
}

export interface CustomerInsightProfile {
  customer: Customer
  totalVisits: number
  firstVisitDate: string | null
  lastVisitDate: string | null
  daysSinceLastVisit: number | null
  servicesReceived: string[]
  primaryService: string | null
  acquisitionSource: string | null
  segments: CustomerSegment[]
  feedbackHistory: {
    visitId: string
    date: string
    service: string
    firstVisitAnswer: boolean
    rating: number | null
    feedbackText: string | null
    hasDiscrepancy: boolean
  }[]
  hasSelfReportDiscrepancy: boolean
}

/**
 * Evaluates rule-based segments for a customer based on actual visit history
 */
export function classifyCustomerSegments(
  customerVisits: Visit[],
  referenceDate: Date = new Date(),
  config: CustomerSegmentConfig = DEFAULT_SEGMENT_CONFIG
): CustomerSegment[] {
  const segments: CustomerSegment[] = []
  const visitCount = customerVisits.length

  if (visitCount === 0) return segments

  // Sort visits chronologically
  const sorted = [...customerVisits].sort((a, b) => 
    new Date(a.visit_timestamp || a.created_at).getTime() - new Date(b.visit_timestamp || b.created_at).getTime()
  )

  const firstVisitTime = new Date(sorted[0].visit_timestamp || sorted[0].created_at).getTime()
  const lastVisitTime = new Date(sorted[sorted.length - 1].visit_timestamp || sorted[sorted.length - 1].created_at).getTime()

  const msInDay = 24 * 60 * 60 * 1000
  const daysSinceFirst = Math.floor((referenceDate.getTime() - firstVisitTime) / msInDay)
  const daysSinceLast = Math.floor((referenceDate.getTime() - lastVisitTime) / msInDay)

  // 1. New Customer: First visit occurred within the new window (e.g. 30 days) AND at most 1 visit
  if (visitCount === 1 && daysSinceFirst <= config.newWindowDays) {
    segments.push('new')
  }

  // 2. Returning Customer: 2 or more visits
  if (visitCount >= 2) {
    segments.push('returning')
  }

  // 3. Frequent Customer: 3 or more visits
  if (visitCount >= config.frequentVisitThreshold) {
    segments.push('frequent')
  }

  // 4. Lapsed / Needs Reconnection: More than 45 days since last visit
  if (daysSinceLast >= config.lapsedDaysThreshold) {
    segments.push('lapsed')
  }

  return segments
}

/**
 * Builds a complete customer insight dossier combining visits, services, feedback and discrepancies
 */
export function buildCustomerInsightProfile(
  customer: Customer,
  allVisits: Visit[],
  allSubmissions: QuestionnaireSubmission[],
  referenceDate: Date = new Date(),
  config: CustomerSegmentConfig = DEFAULT_SEGMENT_CONFIG
): CustomerInsightProfile {
  const customerVisits = allVisits
    .filter(v => v.customer_id === customer.id)
    .sort((a, b) => new Date(a.visit_timestamp || a.created_at).getTime() - new Date(b.visit_timestamp || b.created_at).getTime())

  const customerSubmissions = allSubmissions.filter(s => s.customer_id === customer.id)

  const totalVisits = customerVisits.length
  const firstVisitDate = customerVisits[0]?.visit_timestamp || customer.first_seen_at || null
  const lastVisitDate = customerVisits[customerVisits.length - 1]?.visit_timestamp || customer.last_seen_at || null

  let daysSinceLastVisit: number | null = null
  if (lastVisitDate) {
    const msInDay = 24 * 60 * 60 * 1000
    daysSinceLastVisit = Math.max(0, Math.floor((referenceDate.getTime() - new Date(lastVisitDate).getTime()) / msInDay))
  }

  // Service history counts
  const serviceCounts: Record<string, number> = {}
  for (const v of customerVisits) {
    if (v.service) {
      serviceCounts[v.service] = (serviceCounts[v.service] || 0) + 1
    }
  }

  const servicesReceived = Object.keys(serviceCounts)
  const primaryService = servicesReceived.length > 0 
    ? Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0][0] 
    : null

  // Segments
  const segments = classifyCustomerSegments(customerVisits, referenceDate, config)

  // Feedback history & Discrepancy Detection:
  // A discrepancy occurs if customer selected "Yes, first visit" on a visit that was NOT their first visit in the database!
  let hasSelfReportDiscrepancy = false
  const feedbackHistory = customerSubmissions.map(sub => {
    const visitIdx = customerVisits.findIndex(v => v.id === sub.visit_id)
    const isFirstVisitAccordingToSystem = visitIdx === 0
    const answeredFirstVisit = sub.first_visit_answer === true
    const discrepancy = answeredFirstVisit && !isFirstVisitAccordingToSystem

    if (discrepancy) {
      hasSelfReportDiscrepancy = true
    }

    const visit = customerVisits.find(v => v.id === sub.visit_id)

    return {
      visitId: sub.visit_id,
      date: sub.submitted_at,
      service: sub.service_answer || visit?.service || 'Service',
      firstVisitAnswer: sub.first_visit_answer,
      rating: sub.rating,
      feedbackText: sub.feedback_text,
      hasDiscrepancy: discrepancy
    }
  })

  return {
    customer,
    totalVisits,
    firstVisitDate,
    lastVisitDate,
    daysSinceLastVisit,
    servicesReceived,
    primaryService,
    acquisitionSource: customer.first_discovery_source,
    segments,
    feedbackHistory,
    hasSelfReportDiscrepancy
  }
}
