import test from 'node:test'
import assert from 'node:assert/strict'
import { store } from '../../src/lib/services/store'

test('Customer Service - Creates and matches customer in same tenant', () => {
  const bizId = 'biz_paso_elite'
  const phone = '0809 999 1111' // Nigerian local format

  // First visit creation
  const res1 = store.createOrUpdateCustomer(bizId, {
    phone,
    name: 'Chioma Ade'
  })
  assert.equal(res1.isNew, true)
  assert.equal(res1.customer.normalized_phone, '+2348099991111')
  assert.equal(res1.customer.business_id, bizId)

  // Second interaction with same phone matches existing customer
  const res2 = store.createOrUpdateCustomer(bizId, {
    phone: '2348099991111',
    name: 'Chioma Ade'
  })
  assert.equal(res2.isNew, false)
  assert.equal(res2.customer.id, res1.customer.id)
})

test('Tenant Isolation - Same phone in Business A is NOT matched in Business B', () => {
  const bizA = 'biz_paso_elite'
  const bizB = 'biz_apex_wellness'
  const sharedPhone = '+15559876543'

  // Register in Business A
  const custA = store.createOrUpdateCustomer(bizA, {
    phone: sharedPhone,
    name: 'Client in Salon'
  })

  // Register in Business B
  const custB = store.createOrUpdateCustomer(bizB, {
    phone: sharedPhone,
    name: 'Client in Medspa'
  })

  // Both records must have different IDs and be scoped to their respective business_id
  assert.notEqual(custA.customer.id, custB.customer.id)
  assert.equal(custA.customer.business_id, bizA)
  assert.equal(custB.customer.business_id, bizB)

  // Querying Business A should never return Business B's customer
  const foundInA = store.findCustomerByPhone(bizA, sharedPhone)
  assert.equal(foundInA?.id, custA.customer.id)
  assert.equal(foundInA?.name, 'Client in Salon')
})

test('Visit Service - Correctly determines first vs returning visit', () => {
  const bizId = 'biz_apex_wellness'
  const cust = store.createOrUpdateCustomer(bizId, {
    phone: '+15554443322',
    name: 'David Test'
  }).customer

  // First visit
  const visit1 = store.recordVisit(bizId, {
    customerId: cust.id,
    service: 'Skin Health Consultation',
    sendQuestionnaire: true
  })
  assert.equal(visit1.isReturningClient, false)
  assert.ok(visit1.token)
  assert.equal(visit1.visit.questionnaire_status, 'sent')

  // Second visit
  const visit2 = store.recordVisit(bizId, {
    customerId: cust.id,
    service: 'Custom HydraFacial & Peel',
    sendQuestionnaire: false
  })
  assert.equal(visit2.isReturningClient, true)
  assert.equal(visit2.visit.questionnaire_status, 'none')
})

test('Questionnaire Flow - Validates token, submits once, and prevents replay', () => {
  const bizId = 'biz_paso_elite'
  const cust = store.createOrUpdateCustomer(bizId, {
    phone: '0802 333 4444',
    name: 'Tunde Bakare'
  }).customer

  const { token, visit } = store.recordVisit(bizId, {
    customerId: cust.id,
    service: 'Signature Haircut & Beard Grooming',
    sendQuestionnaire: true
  })

  assert.ok(token)
  assert.equal(token.consumed_at, null)

  // 1. Valid first submission
  const subResult = store.submitQuestionnaire(token.token_hash, {
    firstVisitAnswer: true,
    discoverySourceAnswer: 'Friend or Family Recommendation',
    serviceAnswer: 'Signature Haircut & Beard Grooming',
    rating: 5,
    feedbackText: 'Great cut by Ugo!'
  })

  assert.equal(subResult.success, true)
  assert.ok(subResult.submission)
  assert.equal(token.consumed_at !== null, true)

  // Visit status updated
  const updatedVisit = store.getVisitsByBusiness(bizId).find(v => v.id === visit.id)
  assert.equal(updatedVisit?.questionnaire_status, 'submitted')

  // 2. Second submission with same token must fail with ALREADY_SUBMITTED
  const replayResult = store.submitQuestionnaire(token.token_hash, {
    firstVisitAnswer: false,
    discoverySourceAnswer: 'Instagram',
    serviceAnswer: 'Signature Haircut & Beard Grooming'
  })

  assert.equal(replayResult.success, false)
  assert.equal(replayResult.error, 'ALREADY_SUBMITTED')

  // 3. Invalid token hash fails
  const invalidResult = store.submitQuestionnaire('bogus_hash_123', {
    firstVisitAnswer: true,
    discoverySourceAnswer: 'Walk-in',
    serviceAnswer: 'Service'
  })
  assert.equal(invalidResult.success, false)
  assert.equal(invalidResult.error, 'INVALID_TOKEN')
})
