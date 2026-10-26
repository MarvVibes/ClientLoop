import test from 'node:test'
import assert from 'node:assert/strict'
import { WhatsAppQueueService } from '../../src/lib/messaging/messageQueue'
import { MockWhatsAppProvider, APPROVED_TEMPLATES } from '../../src/lib/messaging/mockProvider'
import { store } from '../../src/lib/services/store'

test('WhatsApp Provider - Validates approved templates and parameters', async () => {
  const provider = new MockWhatsAppProvider()

  // 1. Rejects unapproved template
  const unapprovedRes = await provider.sendMessage({
    businessId: 'biz_paso_elite',
    customerId: 'cust_test_1',
    recipientPhone: '+2348031234567',
    templateName: 'unapproved_marketing_blast',
    parameters: {},
    idempotencyKey: 'idemp_test_1'
  })
  assert.equal(unapprovedRes.success, false)
  assert.equal(unapprovedRes.errorCode, 'TEMPLATE_NOT_APPROVED')

  // 2. Rejects missing required parameters
  const missingParamRes = await provider.sendMessage({
    businessId: 'biz_paso_elite',
    customerId: 'cust_test_1',
    recipientPhone: '+2348031234567',
    templateName: 'post_visit_followup_v2',
    parameters: {
      customer_name: 'Amaka',
      // missing business_name and secure_form_link
    },
    idempotencyKey: 'idemp_test_2'
  })
  assert.equal(missingParamRes.success, false)
  assert.equal(missingParamRes.errorCode, 'MISSING_TEMPLATE_PARAM')

  // 3. Accepts valid template and parameters
  const validRes = await provider.sendMessage({
    businessId: 'biz_paso_elite',
    customerId: 'cust_test_1',
    recipientPhone: '+2348031234567',
    templateName: 'post_visit_followup_v2',
    parameters: {
      customer_name: 'Amaka',
      business_name: 'Paso Elite Unisex Salon',
      secure_form_link: 'https://clientloop.app/f/mock_token_123'
    },
    idempotencyKey: 'idemp_test_3'
  })
  assert.equal(validRes.success, true)
  assert.equal(validRes.status, 'delivered')
  assert.ok(validRes.providerMessageId?.startsWith('wamid.'))
})

test('WhatsApp Queue - Idempotency deduplication prevents duplicate send', async () => {
  const queue = new WhatsAppQueueService()
  const bizId = 'biz_paso_elite'

  // Register a test customer
  const cust = store.createOrUpdateCustomer(bizId, {
    phone: '+2348011223344',
    name: 'Idempotency Customer'
  }).customer

  const idempotencyKey = `idemp_repeat_${Date.now()}`

  const job = {
    businessId: bizId,
    customerId: cust.id,
    recipientPhone: cust.normalized_phone,
    templateName: 'post_visit_followup_v2',
    parameters: {
      customer_name: cust.name || 'Valued Guest',
      business_name: 'Paso Elite Salon',
      secure_form_link: 'https://clientloop.app/f/token_repeat_1'
    },
    idempotencyKey
  }

  // First send
  const res1 = await queue.enqueueMessage(job)
  assert.equal(res1.success, true)
  assert.ok(res1.providerMessageId)
  const firstId = res1.providerMessageId

  // Second send with same idempotency key
  const res2 = await queue.enqueueMessage(job)
  assert.equal(res2.success, true)
  assert.equal(res2.providerMessageId, firstId)

  // Verify only 1 message exists in queue ledger with this key
  const bizMessages = queue.getMessagesByBusiness(bizId)
  const matching = bizMessages.filter(m => m.idempotency_key === idempotencyKey)
  assert.equal(matching.length, 1)
})

test('WhatsApp Queue - Opt-out suppression blocks messages to opted-out customers', async () => {
  const queue = new WhatsAppQueueService()
  const bizId = 'biz_apex_wellness'

  // Register customer and mark opted-out
  const cust = store.createOrUpdateCustomer(bizId, {
    phone: '+15558889900',
    name: 'Opted Out Customer'
  }).customer
  store.setCustomerOptOut(bizId, cust.id, true)

  const verifyCust = store.findCustomerById(bizId, cust.id)
  assert.equal(verifyCust?.consent_status, 'opted_out')

  // Attempt to send follow-up
  const res = await queue.enqueueMessage({
    businessId: bizId,
    customerId: cust.id,
    recipientPhone: cust.normalized_phone,
    templateName: 'post_visit_followup_v2',
    parameters: {
      customer_name: cust.name || 'Guest',
      business_name: 'Apex Wellness',
      secure_form_link: 'https://clientloop.app/f/suppressed_test'
    },
    idempotencyKey: `idemp_suppressed_${Date.now()}`
  })

  // Must be suppressed
  assert.equal(res.success, false)
  assert.equal(res.status, 'suppressed')
  assert.equal(res.errorCode, 'OPT_OUT_SUPPRESSED')
  assert.equal(res.messageRecord?.status, 'suppressed')
})

test('WhatsApp Webhook - Inbound STOP keyword triggers instant opt-out suppression', () => {
  const queue = new WhatsAppQueueService()
  const bizId = 'biz_paso_elite'
  const phone = '+2348077665544'

  // Create customer who is initially not opted-out
  const cust = store.createOrUpdateCustomer(bizId, {
    phone,
    name: 'Consent Tester'
  }).customer
  assert.equal(cust.consent_status, 'implicit_transaction')

  // Simulate Meta inbound webhook with "STOP"
  const webhookResult = queue.processWebhook({
    type: 'inbound_message',
    senderPhone: phone,
    text: 'Please STOP sending me messages'
  })

  assert.equal(webhookResult.processedInbound, 1)
  assert.ok(webhookResult.optOutsTriggered.includes(phone))

  // Verify store record has been updated
  const updatedCust = store.findCustomerById(bizId, cust.id)
  assert.equal(updatedCust?.consent_status, 'opted_out')
})

test('WhatsApp Webhook - Signature verification', () => {
  const queue = new WhatsAppQueueService()

  // Invalid signature header format
  assert.throws(() => {
    queue.processWebhook({ type: 'inbound_message' }, 'invalid_header_signature')
  }, /WEBHOOK_SIGNATURE_INVALID/)

  // Valid format passes
  assert.doesNotThrow(() => {
    queue.processWebhook({ type: 'inbound_message', senderPhone: '+15551234567', text: 'Hi' }, 'sha256=abcdef0123456789')
  })
})
