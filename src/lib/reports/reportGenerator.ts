// ====================================================================
// CLIENTLOOP WEEKLY & MONTHLY EXECUTIVE PERFORMANCE REPORT GENERATOR
// Timezone-Aware Metric Reconciliation with Period-over-Period Comparisons
// Rule-Based Transparent Recommendations (Zero Fabricated Advice)
// ====================================================================

import { store } from '../services/store'
import { Business, Customer, Visit, QuestionnaireSubmission, ReviewActivity } from '../types/database'

export type ReportPeriodType = 'week' | 'month'

export interface ReportDateBoundary {
  currentStart: string
  currentEnd: string
  previousStart: string
  previousEnd: string
  label: string
  previousLabel: string
}

export interface MetricComparison {
  current: number
  previous: number
  changePercent: number | null // null if previous was 0
  isIncrease: boolean
}

export interface ReportRecommendation {
  id: string
  type: 'growth' | 'acquisition' | 'retention' | 'review' | 'operations'
  headline: string
  rationale: string
  actionableStep: string
  priority: 'high' | 'medium' | 'info'
}

export interface PerformanceReport {
  businessId: string
  businessName: string
  periodType: ReportPeriodType
  timezone: string
  dateBoundary: ReportDateBoundary

  // 1. Customer Growth & Retention
  visits: MetricComparison
  uniqueCustomers: MetricComparison
  newCustomersAcquired: MetricComparison
  returningCustomers: MetricComparison
  newCustomerPercentage: number
  repeatCustomerPercentage: number

  // 2. Acquisition & Marketing Attribution
  acquisitionBreakdown: {
    source: string
    count: number
    percentage: number
    previousCount: number
  }[]
  topAcquisitionSource: string | null
  knownSourcePercentage: number
  unknownSourceCount: number

  // 3. Service Performance
  servicesBreakdown: {
    name: string
    count: number
    percentage: number
    previousCount: number
  }[]
  topService: string | null

  // 4. Feedback & Insights
  invitationsCreated: MetricComparison
  questionnairesCompleted: MetricComparison
  completionRate: MetricComparison
  averageRating: number | null
  feedbackComments: {
    customerName: string
    date: string
    service: string
    rating: number | null
    text: string
  }[]

  // 5. Google Review Activity
  reviewInvitationsShown: MetricComparison
  reviewClicks: MetricComparison
  reviewClickThroughRate: MetricComparison
  isGoogleReviewConfigured: boolean
  reviewUrl: string | null

  // 6. Transparent Rule-Based Recommendations
  recommendations: ReportRecommendation[]
}

/**
 * Calculates start and end boundaries for current and previous periods respecting timezone
 */
export function calculateReportBoundaries(
  periodType: ReportPeriodType,
  timezone = 'Africa/Lagos',
  referenceDate = new Date()
): ReportDateBoundary {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const [yearStr, monthStr, dayStr] = formatter.format(referenceDate).split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)

  if (periodType === 'week') {
    // Current day of week (0 = Sunday, 1 = Monday)
    const localNow = new Date(Date.UTC(year, month, day))
    const dayOfWeek = localNow.getUTCDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const currentMonday = new Date(Date.UTC(year, month, day + diffToMonday, 0, 0, 0))
    const currentSunday = new Date(Date.UTC(year, month, day + diffToMonday + 6, 23, 59, 59, 999))

    const prevMonday = new Date(Date.UTC(year, month, day + diffToMonday - 7, 0, 0, 0))
    const prevSunday = new Date(Date.UTC(year, month, day + diffToMonday - 1, 23, 59, 59, 999))

    const fmtDate = (d: Date) => d.toISOString().split('T')[0]

    return {
      currentStart: currentMonday.toISOString(),
      currentEnd: currentSunday.toISOString(),
      previousStart: prevMonday.toISOString(),
      previousEnd: prevSunday.toISOString(),
      label: `Week of ${fmtDate(currentMonday)} to ${fmtDate(currentSunday)}`,
      previousLabel: `Prior Week (${fmtDate(prevMonday)} to ${fmtDate(prevSunday)})`
    }
  }

  // Monthly Period
  const currentMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0))
  const currentMonthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

  const prevMonthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const prevMonthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return {
    currentStart: currentMonthStart.toISOString(),
    currentEnd: currentMonthEnd.toISOString(),
    previousStart: prevMonthStart.toISOString(),
    previousEnd: prevMonthEnd.toISOString(),
    label: `${monthNames[month]} ${year}`,
    previousLabel: `${monthNames[(month + 11) % 12]} ${month === 0 ? year - 1 : year}`
  }
}

function compareMetrics(current: number, previous: number): MetricComparison {
  let changePercent: number | null = null
  if (previous > 0) {
    changePercent = Math.round(((current - previous) / previous) * 100)
  } else if (current > 0) {
    changePercent = 100
  } else {
    changePercent = 0
  }

  return {
    current,
    previous,
    changePercent,
    isIncrease: current >= previous
  }
}

/**
 * Generates an executive performance report with period-over-period comparison
 */
export function generatePerformanceReport(
  businessId: string,
  periodType: ReportPeriodType = 'week',
  referenceDate: Date = new Date()
): PerformanceReport {
  const business = store.getBusinessById(businessId)
  if (!business) {
    throw new Error(`Business with ID ${businessId} not found`)
  }

  const timezone = business.timezone || 'Africa/Lagos'
  const bounds = calculateReportBoundaries(periodType, timezone, referenceDate)

  const curStart = new Date(bounds.currentStart).getTime()
  const curEnd = new Date(bounds.currentEnd).getTime()
  const prevStart = new Date(bounds.previousStart).getTime()
  const prevEnd = new Date(bounds.previousEnd).getTime()

  const allVisits = store.getVisitsByBusiness(businessId)
  const allCustomers = store.getCustomersByBusiness(businessId)
  const allSubmissions = store.getSubmissionsByBusiness(businessId)
  const allReviewEvents = store.getReviewActivities(businessId)

  // 1. Filter visits for current & previous periods
  const currentVisits = allVisits.filter(v => {
    const t = new Date(v.visit_timestamp || v.created_at).getTime()
    return t >= curStart && t <= curEnd
  })

  const previousVisits = allVisits.filter(v => {
    const t = new Date(v.visit_timestamp || v.created_at).getTime()
    return t >= prevStart && t <= prevEnd
  })

  // 2. Identify new vs returning customers strictly
  // A customer is "new" if their first visit in business history was in this period
  const customerFirstVisitMap = new Map<string, number>()
  for (const v of allVisits) {
    const t = new Date(v.visit_timestamp || v.created_at).getTime()
    const existing = customerFirstVisitMap.get(v.customer_id)
    if (!existing || t < existing) {
      customerFirstVisitMap.set(v.customer_id, t)
    }
  }

  const curVisitedCustIds = new Set(currentVisits.map(v => v.customer_id))
  const prevVisitedCustIds = new Set(previousVisits.map(v => v.customer_id))

  let curNewAcquired = 0
  let curReturning = 0
  for (const custId of curVisitedCustIds) {
    const firstVisitTime = customerFirstVisitMap.get(custId) || 0
    if (firstVisitTime >= curStart && firstVisitTime <= curEnd) {
      curNewAcquired++
    } else {
      curReturning++
    }
  }

  let prevNewAcquired = 0
  let prevReturning = 0
  for (const custId of prevVisitedCustIds) {
    const firstVisitTime = customerFirstVisitMap.get(custId) || 0
    if (firstVisitTime >= prevStart && firstVisitTime <= prevEnd) {
      prevNewAcquired++
    } else {
      prevReturning++
    }
  }

  const visitsComp = compareMetrics(currentVisits.length, previousVisits.length)
  const uniqueCustComp = compareMetrics(curVisitedCustIds.size, prevVisitedCustIds.size)
  const newCustComp = compareMetrics(curNewAcquired, prevNewAcquired)
  const returningCustComp = compareMetrics(curReturning, prevReturning)

  const newCustPct = curVisitedCustIds.size > 0 
    ? Math.round((curNewAcquired / curVisitedCustIds.size) * 100) 
    : 0
  const repeatCustPct = 100 - newCustPct

  // 3. Acquisition Breakdown for new clients in current period
  const curSourceCounts: Record<string, number> = {}
  let unknownCount = 0

  for (const custId of curVisitedCustIds) {
    const cust = allCustomers.find(c => c.id === custId)
    const source = cust?.first_discovery_source?.trim()
    if (source && source !== 'Other' && source !== 'Unknown') {
      curSourceCounts[source] = (curSourceCounts[source] || 0) + 1
    } else if (source === 'Other') {
      curSourceCounts['Other'] = (curSourceCounts['Other'] || 0) + 1
    } else {
      unknownCount++
    }
  }

  // Previous source counts
  const prevSourceCounts: Record<string, number> = {}
  for (const custId of prevVisitedCustIds) {
    const cust = allCustomers.find(c => c.id === custId)
    const source = cust?.first_discovery_source?.trim()
    if (source) {
      prevSourceCounts[source] = (prevSourceCounts[source] || 0) + 1
    }
  }

  const totalKnownSources = Object.values(curSourceCounts).reduce((a, b) => a + b, 0)
  const totalReported = totalKnownSources + unknownCount
  const knownSourcePercentage = totalReported > 0 
    ? Math.round((totalKnownSources / totalReported) * 100) 
    : 0

  const acquisitionBreakdown = Object.entries(curSourceCounts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalKnownSources > 0 ? Math.round((count / totalKnownSources) * 100) : 0,
      previousCount: prevSourceCounts[source] || 0
    }))
    .sort((a, b) => b.count - a.count)

  const topAcquisitionSource = acquisitionBreakdown[0]?.source || null

  // 4. Services Breakdown
  const curServiceCounts: Record<string, number> = {}
  for (const v of currentVisits) {
    const s = v.service || 'Standard Service'
    curServiceCounts[s] = (curServiceCounts[s] || 0) + 1
  }

  const prevServiceCounts: Record<string, number> = {}
  for (const v of previousVisits) {
    const s = v.service || 'Standard Service'
    prevServiceCounts[s] = (prevServiceCounts[s] || 0) + 1
  }

  const servicesBreakdown = Object.entries(curServiceCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: currentVisits.length > 0 ? Math.round((count / currentVisits.length) * 100) : 0,
      previousCount: prevServiceCounts[name] || 0
    }))
    .sort((a, b) => b.count - a.count)

  const topService = servicesBreakdown[0]?.name || null

  // 5. Questionnaire Submissions in period
  const curSubmissions = allSubmissions.filter(s => {
    const t = new Date(s.submitted_at).getTime()
    return t >= curStart && t <= curEnd
  })
  const prevSubmissions = allSubmissions.filter(s => {
    const t = new Date(s.submitted_at).getTime()
    return t >= prevStart && t <= prevEnd
  })

  const curInvitationsSent = currentVisits.filter(v => v.questionnaire_status === 'sent' || v.questionnaire_status === 'submitted').length
  const prevInvitationsSent = previousVisits.filter(v => v.questionnaire_status === 'sent' || v.questionnaire_status === 'submitted').length

  const curCompRate = curInvitationsSent > 0 ? Math.round((curSubmissions.length / curInvitationsSent) * 100) : 0
  const prevCompRate = prevInvitationsSent > 0 ? Math.round((prevSubmissions.length / prevInvitationsSent) * 100) : 0

  const invitationsComp = compareMetrics(curInvitationsSent, prevInvitationsSent)
  const submissionsComp = compareMetrics(curSubmissions.length, prevSubmissions.length)
  const compRateComp = compareMetrics(curCompRate, prevCompRate)

  // Average Rating
  const ratedSubs = curSubmissions.filter(s => typeof s.rating === 'number' && s.rating > 0)
  const averageRating = ratedSubs.length > 0 
    ? Number((ratedSubs.reduce((acc, s) => acc + (s.rating || 0), 0) / ratedSubs.length).toFixed(1))
    : null

  // Raw Customer Comments
  const feedbackComments = curSubmissions
    .filter(s => s.feedback_text && s.feedback_text.trim().length > 0)
    .map(s => {
      const cust = allCustomers.find(c => c.id === s.customer_id)
      return {
        customerName: cust?.name || 'Guest',
        date: s.submitted_at,
        service: s.service_answer,
        rating: s.rating,
        text: s.feedback_text || ''
      }
    })

  // 6. Review Activity
  const curReviews = allReviewEvents.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t >= curStart && t <= curEnd
  })
  const prevReviews = allReviewEvents.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t >= prevStart && t <= prevEnd
  })

  const curShown = curReviews.filter(r => r.event_type === 'invitation_shown').length
  const prevShown = prevReviews.filter(r => r.event_type === 'invitation_shown').length
  const curClicks = curReviews.filter(r => r.event_type === 'link_clicked').length
  const prevClicks = prevReviews.filter(r => r.event_type === 'link_clicked').length

  const curCtr = curShown > 0 ? Math.round((curClicks / curShown) * 100) : 0
  const prevCtr = prevShown > 0 ? Math.round((prevClicks / prevShown) * 100) : 0

  const shownComp = compareMetrics(curShown, prevShown)
  const clicksComp = compareMetrics(curClicks, prevClicks)
  const ctrComp = compareMetrics(curCtr, prevCtr)

  // 7. Transparent Rule-Based Recommendations
  const recommendations: ReportRecommendation[] = []

  // Recommendation Rule 1: Acquisition Source Insight
  if (topAcquisitionSource && acquisitionBreakdown[0]?.percentage >= 35) {
    recommendations.push({
      id: 'rec_acquisition_strength',
      type: 'acquisition',
      headline: `"${topAcquisitionSource}" drove ${acquisitionBreakdown[0].percentage}% of new client discoveries`,
      rationale: `Data shows ${acquisitionBreakdown[0].count} out of ${totalKnownSources} new clients identified "${topAcquisitionSource}" as their first touchpoint during this period.`,
      actionableStep: `Double down on ${topAcquisitionSource}: encourage satisfied visitors from this channel to share stories, or refresh your profile assets here.`,
      priority: 'high'
    })
  }

  // Recommendation Rule 2: Unknown Source Gap
  if (unknownCount > 0 && knownSourcePercentage < 70) {
    recommendations.push({
      id: 'rec_unknown_sources',
      type: 'operations',
      headline: `${unknownCount} clients have unrecorded discovery sources (${100 - knownSourcePercentage}% data gap)`,
      rationale: `When staff logs visits, asking a quick friendly "How did you hear about us today?" will give you clear visibility into where to focus your marketing budget.`,
      actionableStep: `Remind reception and floor staff to inquire on check-in or verify that the 60-second WhatsApp questionnaire is sent after visits.`,
      priority: 'medium'
    })
  }

  // Recommendation Rule 3: Retention vs New Customer Shift
  if (returningCustComp.changePercent !== null && returningCustComp.changePercent > 15) {
    recommendations.push({
      id: 'rec_retention_growth',
      type: 'retention',
      headline: `Repeat visits grew by +${returningCustComp.changePercent}% over the prior period`,
      rationale: `${curReturning} returning clients visited during this period compared to ${prevReturning} previously. Client retention is compounding positively.`,
      actionableStep: `Acknowledge loyal regulars on their next appointment with a small appreciation or loyalty recognition.`,
      priority: 'info'
    })
  } else if (returningCustComp.changePercent !== null && returningCustComp.changePercent < -15 && previousVisits.length >= 5) {
    recommendations.push({
      id: 'rec_retention_dip',
      type: 'retention',
      headline: `Repeat client visits decreased by ${Math.abs(returningCustComp.changePercent)}% this period`,
      rationale: `Recorded returning visits dropped from ${prevReturning} to ${curReturning}.`,
      actionableStep: `Check the "Lapsed" client segment in your Clients directory and send gentle check-ins to customers who have not visited in 45+ days.`,
      priority: 'high'
    })
  }

  // Recommendation Rule 4: Google Review Outbound CTR
  if (business.google_review_url && curClicks > 0 && curCtr >= 30) {
    recommendations.push({
      id: 'rec_review_momentum',
      type: 'review',
      headline: `Strong review engagement: ${curCtr}% of questionnaire respondents clicked your Google Review link`,
      rationale: `${curClicks} clients tapped the optional Google review link after completing their questionnaire.`,
      actionableStep: `Monitor your Google Business Profile to reply to any newly posted customer reviews with warm gratitude.`,
      priority: 'medium'
    })
  } else if (!business.google_review_url) {
    recommendations.push({
      id: 'rec_missing_google_url',
      type: 'review',
      headline: `Google Review URL is not configured for ${business.name}`,
      rationale: `Without a configured Google Maps review link, happy questionnaire respondents cannot be prompted to leave a public Google review.`,
      actionableStep: `Visit Settings → Review Management, enter your official Google review URL (e.g. https://g.page/r/.../review), and click Save.`,
      priority: 'high'
    })
  }

  return {
    businessId,
    businessName: business.name,
    periodType,
    timezone,
    dateBoundary: bounds,
    visits: visitsComp,
    uniqueCustomers: uniqueCustComp,
    newCustomersAcquired: newCustComp,
    returningCustomers: returningCustComp,
    newCustomerPercentage: newCustPct,
    repeatCustomerPercentage: repeatCustPct,
    acquisitionBreakdown,
    topAcquisitionSource,
    knownSourcePercentage,
    unknownSourceCount: unknownCount,
    servicesBreakdown,
    topService,
    invitationsCreated: invitationsComp,
    questionnairesCompleted: submissionsComp,
    completionRate: compRateComp,
    averageRating,
    feedbackComments,
    reviewInvitationsShown: shownComp,
    reviewClicks: clicksComp,
    reviewClickThroughRate: ctrComp,
    isGoogleReviewConfigured: Boolean(business.google_review_url),
    reviewUrl: business.google_review_url || null,
    recommendations
  }
}
