// ====================================================================
// CLIENTLOOP PILOT END-TO-END AUTOMATED VERIFICATION TEST SUITE
// Tests Complete 10-Step Operational Lifecycle for Pilot (Paso Elite)
// ====================================================================

import test from 'node:test'
import assert from 'node:assert/strict'
import { store } from '../../src/lib/services/store'
import { WhatsAppQueueService } from '../../src/lib/messaging/messageQueue'
import { calculateDashboardMetrics } from '../../src/lib/metrics/dashboardMetrics'
import { exportCustomersCsv, exportVisitsCsv } from '../../src/lib/export/csvExport'
import { googleReviewSync } from '../../src/lib/reviews/googleReviewSync'

test('Pilot E2E Workflow - Complete 10-Step Verification for Paso Elite Unisex Salon', async () => {
  const PASO_ELITE_ID = 'biz_paso_elite'
  const APEX_ID = 'biz_apex_wellness'
  const queue = new WhatsAppQueueService()

  console.log('--- STARTING PILOT 10-STEP E2E VALIDATION ---')

  // -------------------------------------------------------------
  // STEP 1: Authorized staff records a visit in Paso Elite
  // -------------------------------------------------------------
  const phone = '0803 777 8899'
  const customerName = 'Ifeanyi Bassey'
  const serviceName = 'Signature Haircut & Beard Grooming'

  const custRecord = store.createOrUpdateCustomer(PASO_ELITE_ID, {
    phone,
    name: customerName,
    firstDiscoverySource: 'Friend or Family Recommendation'
  })
  assert.equal(custRecord.customer.business_id, PASO_ELITE_ID)
  assert.equal(custRecord.customer.normalized_phone, '+2348037778899')

  const visitRecord = store.recordVisit(PASO_ELITE_ID, {
    customerId: custRecord.customer.id,
    service: serviceName,
    sendQuestionnaire: true
  })
  assert.equal(visitRecord.visit.business_id, PASO_ELITE_ID)
  assert.equal(visitRecord.visit.questionnaire_status, 'sent')
  assert.ok(visitRecord.token)
  const tokenHash = visitRecord.token.token_hash
  console.log('[STEP 1 PASS] Authorized visit recorded with token hash:', tokenHash.substring(0, 8) + '...')

  // -------------------------------------------------------------
  // STEP 2: Customer matching is strictly tenant-scoped
  // -------------------------------------------------------------
  const foundInPaso = store.findCustomerByPhone(PASO_ELITE_ID, '+2348037778899')
  assert.ok(foundInPaso)
  assert.equal(foundInPaso?.name, customerName)

  const foundInApex = store.findCustomerByPhone(APEX_ID, '+2348037778899')
  assert.equal(foundInApex, undefined, 'Customer must not be visible in Apex Wellness workspace')
  console.log('[STEP 2 PASS] Customer phone isolated strictly to Paso Elite')

  // -------------------------------------------------------------
  // STEP 3: WhatsApp follow-up job queues with permission & idempotency
  // -------------------------------------------------------------
  const idempotencyKey = `pilot_idemp_${visitRecord.visit.id}`
  const sendResult1 = await queue.enqueueMessage({
    businessId: PASO_ELITE_ID,
    customerId: custRecord.customer.id,
    visitId: visitRecord.visit.id,
    recipientPhone: custRecord.customer.normalized_phone,
    templateName: 'post_visit_followup_v2',
    parameters: {
      customer_name: customerName,
      business_name: 'Paso Elite Unisex Salon',
      secure_form_link: `https://clientloop.app/f/${tokenHash}`
    },
    idempotencyKey
  })

  assert.equal(sendResult1.success, true)
  assert.ok(sendResult1.providerMessageId?.startsWith('wamid.'))

  // Retry with same idempotency key must not duplicate
  const sendResult2 = await queue.enqueueMessage({
    businessId: PASO_ELITE_ID,
    customerId: custRecord.customer.id,
    visitId: visitRecord.visit.id,
    recipientPhone: custRecord.customer.normalized_phone,
    templateName: 'post_visit_followup_v2',
    parameters: {
      customer_name: customerName,
      business_name: 'Paso Elite Unisex Salon',
      secure_form_link: `https://clientloop.app/f/${tokenHash}`
    },
    idempotencyKey
  })
  assert.equal(sendResult2.providerMessageId, sendResult1.providerMessageId)
  console.log('[STEP 3 PASS] WhatsApp job delivered idempotently via mock provider')

  // -------------------------------------------------------------
  // STEP 4: Customer opens single-use expiring questionnaire without re-entering phone
  // -------------------------------------------------------------
  const retrievedToken = store.findTokenByHash(tokenHash)
  assert.ok(retrievedToken)
  assert.equal(retrievedToken?.business_id, PASO_ELITE_ID)
  assert.equal(retrievedToken?.consumed_at, null)
  // Check that customer phone is never in the token or public URL
  assert.ok(!tokenHash.includes('8037778899') && !tokenHash.includes('+234'))
  console.log('[STEP 4 PASS] Secure zero-PII token verified')

  // -------------------------------------------------------------
  // STEP 5: Response saves once idempotently
  // -------------------------------------------------------------
  const submitResult1 = store.submitQuestionnaire(tokenHash, {
    firstVisitAnswer: true,
    discoverySourceAnswer: 'Friend or Family Recommendation',
    serviceAnswer: serviceName,
    rating: 5,
    feedbackText: 'Loved the haircut and attentive styling!'
  })
  assert.equal(submitResult1.success, true)
  assert.ok(submitResult1.submission)

  // Re-submission attempt must be rejected
  const submitResult2 = store.submitQuestionnaire(tokenHash, {
    firstVisitAnswer: true,
    discoverySourceAnswer: 'Friend or Family Recommendation',
    serviceAnswer: serviceName
  })
  assert.equal(submitResult2.success, false)
  assert.equal(submitResult2.error, 'ALREADY_SUBMITTED')
  console.log('[STEP 5 PASS] Questionnaire response saved once; replay rejected')

  // -------------------------------------------------------------
  // STEP 6: Dashboard updates metrics with Africa/Lagos date boundaries
  // -------------------------------------------------------------
  const metrics = calculateDashboardMetrics(PASO_ELITE_ID, { preset: 'all_time' })
  assert.equal(metrics.timezone, 'Africa/Lagos')
  assert.ok(metrics.totalVisits >= 1)
  assert.ok(metrics.questionnairesCompleted >= 1)
  console.log('[STEP 6 PASS] Dashboard metrics reconciled in Africa/Lagos timezone')

  // -------------------------------------------------------------
  // STEP 7: Optional verified review link is shown on thank-you screen
  // -------------------------------------------------------------
  const reviewConfig = googleReviewSync.getReviewConfig(PASO_ELITE_ID)
  assert.ok(reviewConfig.verifiedReviewUrl)
  assert.ok(reviewConfig.verifiedReviewUrl.includes('google.com'))

  const invEvent = store.recordReviewInvitationShown(PASO_ELITE_ID, custRecord.customer.id, visitRecord.visit.id)
  assert.equal(invEvent.event_type, 'invitation_shown')
  console.log('[STEP 7 PASS] Neutral review invitation shown event logged')

  // -------------------------------------------------------------
  // STEP 8: Review link click is recorded separately from actual reviews
  // -------------------------------------------------------------
  const clickEvent = store.recordReviewClick(PASO_ELITE_ID, custRecord.customer.id, visitRecord.visit.id)
  assert.equal(clickEvent.event_type, 'link_clicked')
  assert.equal(clickEvent.verification_level, 'unverified_click')

  const reviewSummary = googleReviewSync.getReviewMetricsSummary(PASO_ELITE_ID)
  assert.ok(reviewSummary.outboundClicks >= 1)
  assert.equal(reviewSummary.syncedReviews, 0, 'Must never claim unsynced clicks are reviews')
  console.log('[STEP 8 PASS] Outbound review click logged as unverified_click')

  // -------------------------------------------------------------
  // STEP 9: Inbound STOP keyword opts out customer and blocks future sends
  // -------------------------------------------------------------
  const stopPayload = {
    type: 'inbound_message',
    senderPhone: custRecord.customer.normalized_phone,
    text: 'STOP'
  }
  const webhookRes = queue.processWebhook(stopPayload)
  assert.equal(webhookRes.processedInbound, 1)

  // Verify customer is marked opted_out
  const customerAfterStop = store.findCustomerById(PASO_ELITE_ID, custRecord.customer.id)
  assert.equal(customerAfterStop?.consent_status, 'opted_out')

  // Attempting to send a follow-up to this customer must be suppressed
  const suppressedSend = await queue.enqueueMessage({
    businessId: PASO_ELITE_ID,
    customerId: custRecord.customer.id,
    recipientPhone: custRecord.customer.normalized_phone,
    templateName: 'post_visit_followup_v2',
    parameters: {
      customer_name: customerName,
      business_name: 'Paso Elite',
      secure_form_link: 'https://clientloop.app/f/blocked_token'
    },
    idempotencyKey: `idemp_suppressed_${Date.now()}`
  })
  assert.equal(suppressedSend.success, false)
  assert.equal(suppressedSend.errorCode, 'OPT_OUT_SUPPRESSED')
  console.log('[STEP 9 PASS] Instant STOP opt-out suppression verified')

  // -------------------------------------------------------------
  // STEP 10: Cross-tenant isolation verification
  // -------------------------------------------------------------
  // Apex Wellness cannot access Paso Elite customers, visits, tokens, responses, or exports
  const apexCustomers = store.getCustomersByBusiness(APEX_ID)
  assert.equal(apexCustomers.some(c => c.id === custRecord.customer.id), false)

  const apexVisits = store.getVisitsByBusiness(APEX_ID)
  assert.equal(apexVisits.some(v => v.id === visitRecord.visit.id), false)

  const apexSubmissions = store.getSubmissionsByBusiness(APEX_ID)
  assert.equal(apexSubmissions.some(s => s.customer_id === custRecord.customer.id), false)

  // Exporting Apex data contains zero Paso Elite phone numbers or records
  const apexExport = exportCustomersCsv(APEX_ID, 'manager')
  assert.equal(apexExport.csv.includes('+2348037778899'), false)
  assert.equal(apexExport.csv.includes('Ifeanyi Bassey'), false)

  console.log('[STEP 10 PASS] Complete cross-tenant isolation confirmed across all tables')
  console.log('--- ALL 10 PILOT E2E STEPS PASSED WITH FLYING COLORS ---')
})
