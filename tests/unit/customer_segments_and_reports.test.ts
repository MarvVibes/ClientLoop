import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyCustomerSegments, buildCustomerInsightProfile } from '../../src/lib/customers/segments'
import { generatePerformanceReport } from '../../src/lib/reports/reportGenerator'
import { Customer, Visit, QuestionnaireSubmission } from '../../src/lib/types/database'

test('Customer Segmentation - Classifies new, returning, frequent, and lapsed strictly by rules', () => {
  const refDate = new Date('2026-07-01T12:00:00Z')

  // Case 1: First visit 5 days ago (1 visit total) -> New
  const newVisits: Visit[] = [
    {
      id: 'v1',
      business_id: 'b1',
      customer_id: 'c1',
      service: 'Cut',
      visit_timestamp: '2026-06-26T12:00:00Z',
      questionnaire_status: 'none',
      created_at: '2026-06-26T12:00:00Z',
      updated_at: '2026-06-26T12:00:00Z'
    }
  ]
  const segsNew = classifyCustomerSegments(newVisits, refDate)
  assert.deepEqual(segsNew, ['new'])

  // Case 2: 2 visits -> Returning
  const retVisits: Visit[] = [
    ...newVisits,
    {
      id: 'v2',
      business_id: 'b1',
      customer_id: 'c1',
      service: 'Beard',
      visit_timestamp: '2026-06-28T12:00:00Z',
      questionnaire_status: 'none',
      created_at: '2026-06-28T12:00:00Z',
      updated_at: '2026-06-28T12:00:00Z'
    }
  ]
  const segsRet = classifyCustomerSegments(retVisits, refDate)
  assert.ok(segsRet.includes('returning'))
  assert.ok(!segsRet.includes('new'))
  assert.ok(!segsRet.includes('frequent'))

  // Case 3: 3 visits -> Frequent (VIP)
  const freqVisits: Visit[] = [
    ...retVisits,
    {
      id: 'v3',
      business_id: 'b1',
      customer_id: 'c1',
      service: 'Cut',
      visit_timestamp: '2026-06-30T12:00:00Z',
      questionnaire_status: 'none',
      created_at: '2026-06-30T12:00:00Z',
      updated_at: '2026-06-30T12:00:00Z'
    }
  ]
  const segsFreq = classifyCustomerSegments(freqVisits, refDate)
  assert.ok(segsFreq.includes('frequent'))
  assert.ok(segsFreq.includes('returning'))

  // Case 4: Last visit was 60 days ago (threshold 45 days) -> Lapsed
  const lapsedVisits: Visit[] = [
    {
      id: 'vl1',
      business_id: 'b1',
      customer_id: 'c2',
      service: 'Cut',
      visit_timestamp: '2026-04-01T12:00:00Z',
      created_at: '2026-04-01T12:00:00Z',
      updated_at: '2026-04-01T12:00:00Z'
    },
    {
      id: 'vl2',
      business_id: 'b1',
      customer_id: 'c2',
      service: 'Cut',
      visit_timestamp: '2026-05-01T12:00:00Z', // 61 days before July 1
      created_at: '2026-05-01T12:00:00Z',
      updated_at: '2026-05-01T12:00:00Z'
    }
  ]
  const segsLapsed = classifyCustomerSegments(lapsedVisits, refDate)
  assert.ok(segsLapsed.includes('lapsed'))
})

test('Discrepancy Detection - Detects when customer answers "Yes, first visit" despite prior records', () => {
  const cust: Customer = {
    id: 'c_disc_1',
    business_id: 'biz_paso_elite',
    normalized_phone: '+2348039998877',
    name: 'Kufre Bassey',
    notes: null,
    consent_status: 'explicit_oral',
    opted_out_at: null,
    first_discovery_source: 'Friend or family referral',
    first_seen_at: '2026-05-01T10:00:00Z',
    last_seen_at: '2026-06-15T10:00:00Z',
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-06-15T10:00:00Z'
  }

  const visits: Visit[] = [
    {
      id: 'v_past_1',
      business_id: 'biz_paso_elite',
      customer_id: 'c_disc_1',
      service: 'Signature Haircut',
      visit_timestamp: '2026-05-01T10:00:00Z',
      questionnaire_status: 'submitted',
      created_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-05-01T10:00:00Z'
    },
    {
      id: 'v_past_2',
      business_id: 'biz_paso_elite',
      customer_id: 'c_disc_1',
      service: 'Signature Haircut',
      visit_timestamp: '2026-06-15T10:00:00Z',
      questionnaire_status: 'submitted',
      created_at: '2026-06-15T10:00:00Z',
      updated_at: '2026-06-15T10:00:00Z'
    }
  ]

  // Customer claims it's their first visit on visit #2!
  const submissions: QuestionnaireSubmission[] = [
    {
      id: 'sub_1',
      business_id: 'biz_paso_elite',
      visit_id: 'v_past_2',
      customer_id: 'c_disc_1',
      token_id: 'tok_1',
      first_visit_answer: true, // Discrepancy!
      discovery_source_answer: 'Friend or family referral',
      discovery_source_clarification: null,
      service_answer: 'Signature Haircut',
      rating: 5,
      feedback_text: 'Always great cuts here!',
      ip_hash: null,
      submitted_at: '2026-06-15T11:00:00Z'
    }
  ]

  const profile = buildCustomerInsightProfile(cust, visits, submissions)
  assert.equal(profile.hasSelfReportDiscrepancy, true)
  assert.equal(profile.feedbackHistory[0].hasDiscrepancy, true)
  assert.equal(profile.totalVisits, 2)
})

test('Executive Performance Reports - Generates weekly metrics, source attribution, and rule-based recommendations', () => {
  const report = generatePerformanceReport('biz_paso_elite', 'week', new Date('2026-06-28T12:00:00Z'))

  assert.equal(report.businessId, 'biz_paso_elite')
  assert.equal(report.periodType, 'week')
  assert.ok(report.visits.current >= 0)
  assert.ok(report.newCustomersAcquired.current >= 0)
  assert.ok(report.returningCustomers.current >= 0)

  // Marketing Attribution integrity
  assert.ok(Array.isArray(report.acquisitionBreakdown))
  assert.ok(report.knownSourcePercentage >= 0 && report.knownSourcePercentage <= 100)

  // Recommendations must be grounded in underlying data
  assert.ok(Array.isArray(report.recommendations))
  for (const rec of report.recommendations) {
    assert.ok(rec.headline.length > 0)
    assert.ok(rec.rationale.length > 0)
    assert.ok(rec.actionableStep.length > 0)
  }
})
