import test from 'node:test'
import assert from 'node:assert/strict'
import { 
  formatPhoneForWhatsApp, 
  generateWhatsAppClickToChat,
  DEFAULT_WHATSAPP_INVITATION_TEMPLATE
} from '../../src/lib/whatsapp/clickToChat'

test('WhatsApp Click-to-Chat - Strips plus and non-digits for wa.me phone param', () => {
  const res1 = formatPhoneForWhatsApp('+234 803 555 0192', '+234')
  assert.equal(res1.isValid, true)
  assert.equal(res1.digitsOnly, '2348035550192')

  const res2 = formatPhoneForWhatsApp('(555) 019-2834', '+1')
  assert.equal(res2.isValid, true)
  assert.equal(res2.digitsOnly, '15550192834')

  const res3 = formatPhoneForWhatsApp('invalid phone')
  assert.equal(res3.isValid, false)
})

test('WhatsApp Click-to-Chat - Generates mobile wa.me and desktop web URLs with encoded message', () => {
  const result = generateWhatsAppClickToChat({
    businessId: 'biz_paso_elite',
    businessName: 'Paso Elite Unisex Salon',
    customerId: 'cust_paso_1',
    customerName: 'Chioma Adebayo',
    visitId: 'visit_p1',
    tokenHash: 'hash_click_to_chat_123',
    phone: '+2348035550192'
  })

  assert.equal(result.digitsOnlyPhone, '2348035550192')
  assert.ok(result.mobileUrl.startsWith('https://wa.me/2348035550192?text='))
  assert.ok(result.webUrl.startsWith('https://web.whatsapp.com/send?phone=2348035550192&text='))
  
  // Message must contain interpolated names and token link
  assert.ok(result.prefilledText.includes('Chioma Adebayo'))
  assert.ok(result.prefilledText.includes('Paso Elite Unisex Salon'))
  assert.ok(result.prefilledText.includes('/f/hash_click_to_chat_123'))
})

test('WhatsApp Click-to-Chat - Honest Audit Logging marks attempt as manual without claiming delivery', () => {
  const result = generateWhatsAppClickToChat({
    businessId: 'biz_paso_elite',
    businessName: 'Paso Elite Unisex Salon',
    customerId: 'cust_paso_1',
    customerName: 'Chioma Adebayo',
    visitId: 'visit_p1',
    tokenHash: 'hash_click_to_chat_123',
    phone: '+2348035550192'
  })

  // CRITICAL HONEST REPORTING: Status is queued, delivery_at is null, never fabricated
  assert.equal(result.auditRecord.business_id, 'biz_paso_elite')
  assert.equal(result.auditRecord.status, 'queued')
  assert.equal(result.auditRecord.delivered_at, null)
  assert.equal(result.auditRecord.read_at, null)
  assert.ok(result.auditRecord.failure_reason?.includes('Manual staff workflow'))
})
