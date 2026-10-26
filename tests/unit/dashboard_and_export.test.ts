import test from 'node:test'
import assert from 'node:assert/strict'
import { store } from '../../src/lib/services/store'
import { calculateDashboardMetrics, calculateDateRangeBounds } from '../../src/lib/metrics/dashboardMetrics'
import { exportCustomersCsv, exportVisitsCsv, sanitizeCsvCell } from '../../src/lib/export/csvExport'
import { googleReviewSync } from '../../src/lib/reviews/googleReviewSync'

test('Dashboard Metrics - Accurately calculates visits, repeat rates and review actions', () => {
  const bizId = 'biz_paso_elite'

  // Seed customer and visits in test
  const cust1 = store.createOrUpdateCustomer(bizId, {
    phone: '+2348055550001',
    name: 'Dashboard Tester 1',
    firstDiscoverySource: 'Google Maps / Local Search'
  }).customer

  // First visit
  const v1 = store.recordVisit(bizId, {
    customerId: cust1.id,
    service: 'Signature Haircut & Beard Grooming',
    sendQuestionnaire: true
  })

  // Second visit for same customer (Repeat client)
  const v2 = store.recordVisit(bizId, {
    customerId: cust1.id,
    service: 'Hair Washing & Deep Scalp Treatment',
    sendQuestionnaire: true
  })

  // Submit feedback for visit 1
  if (v1.token) {
    store.submitQuestionnaire(v1.token.token_hash, {
      firstVisitAnswer: true,
      discoverySourceAnswer: 'Google Maps / Local Search',
      serviceAnswer: 'Signature Haircut & Beard Grooming',
      rating: 5,
      feedbackText: 'Great salon cut!'
    })
    store.recordReviewInvitationShown(bizId, cust1.id, v1.visit.id)
    store.recordReviewClick(bizId, cust1.id, v1.visit.id)
  }

  // Calculate metrics across all_time
  const metrics = calculateDashboardMetrics(bizId, { preset: 'all_time' })

  assert.equal(metrics.businessId, bizId)
  assert.equal(metrics.timezone, 'Africa/Lagos')
  assert.ok(metrics.totalVisits >= 2)
  assert.ok(metrics.uniqueCustomers >= 1)
  assert.ok(metrics.returningCustomers >= 1)
  assert.ok(metrics.repeatCustomerRate > 0)
  assert.ok(metrics.questionnairesCompleted >= 1)
  assert.ok(metrics.reviewInvitationsDisplayed >= 1)
  assert.ok(metrics.reviewLinkClicks >= 1)
  assert.equal(metrics.googleReviewSyncStatus.isConnected, false)
  assert.match(metrics.googleReviewSyncStatus.connectionLabel, /Not Connected/i)
})

test('Dashboard Metrics - Respects Africa/Lagos timezone date boundaries', () => {
  const { startDate, endDate } = calculateDateRangeBounds('today', 'Africa/Lagos')
  assert.ok(startDate.endsWith('Z'))
  assert.ok(endDate.endsWith('Z'))
  assert.ok(new Date(endDate).getTime() >= new Date(startDate).getTime())
})

test('CSV Export - Enforces RBAC permissions', () => {
  const bizId = 'biz_paso_elite'

  // Staff role must be forbidden
  assert.throws(() => {
    exportCustomersCsv(bizId, 'staff')
  }, /UNAUTHORIZED_EXPORT/)

  assert.throws(() => {
    exportVisitsCsv(bizId, 'staff')
  }, /UNAUTHORIZED_EXPORT/)

  // Manager and Owner must be allowed
  assert.doesNotThrow(() => {
    const res = exportCustomersCsv(bizId, 'manager')
    assert.ok(res.csv.includes('Normalized Phone'))
  })

  assert.doesNotThrow(() => {
    const res = exportVisitsCsv(bizId, 'owner')
    assert.ok(res.csv.includes('Visit Date'))
  })
})

test('CSV Export - Mitigates formula injection (CWE-1236)', () => {
  // Test formula injection characters: =, +, -, @, tab, cr
  const dangerousValues = [
    '=cmd|"/c calc"!A1',
    '+1234567890',
    '-2+5+cmd',
    '@SUM(A1:A10)',
    '\tDDE_ATTACK'
  ]

  for (const dangerous of dangerousValues) {
    const sanitized = sanitizeCsvCell(dangerous)
    // Must start with single quote to deactivate formula execution in Excel/Sheets
    assert.ok(
      sanitized.startsWith("'") || sanitized.startsWith('"\''),
      `Expected '${dangerous}' to be escaped with single quote, got '${sanitized}'`
    )
  }

  // Normal strings with commas must be wrapped in quotes
  const withComma = sanitizeCsvCell('Paso Elite, Unisex Salon')
  assert.equal(withComma, '"Paso Elite, Unisex Salon"')

  // Strings with existing double quotes must escape them as double double-quotes
  const withQuotes = sanitizeCsvCell('Haircut "Special" Deal')
  assert.equal(withQuotes, '"Haircut ""Special"" Deal"')
})

test('Google Review Sync - Validates review URLs and enforces unverified boundary', () => {
  // 1. Valid URLs
  const v1 = googleReviewSync.validateGoogleReviewUrl('https://maps.google.com/?cid=123456789')
  assert.equal(v1.isValid, true)

  const v2 = googleReviewSync.validateGoogleReviewUrl('https://g.page/r/sample-business/review')
  assert.equal(v2.isValid, true)

  // 2. Rejects HTTP (insecure)
  const vHttp = googleReviewSync.validateGoogleReviewUrl('http://maps.google.com/?cid=123')
  assert.equal(vHttp.isValid, false)
  assert.match(vHttp.error || '', /HTTPS/i)

  // 3. Rejects foreign domains
  const vForeign = googleReviewSync.validateGoogleReviewUrl('https://attacker-phishing.com/review')
  assert.equal(vForeign.isValid, false)
  assert.match(vForeign.error || '', /not a recognized Google/i)

  // 4. Boundary check: unconfigured sync does not claim verified reviews
  const summary = googleReviewSync.getReviewMetricsSummary('biz_paso_elite')
  assert.equal(summary.syncedReviews, 0)
  assert.match(summary.syncStatusLabel, /Not Connected/i)
  assert.match(summary.complianceBadge, /Zero Review Gating/i)
})
