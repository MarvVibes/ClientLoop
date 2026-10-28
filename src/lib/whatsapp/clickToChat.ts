// ====================================================================
// CLIENTLOOP MANUAL WHATSAPP CLICK-TO-CHAT SERVICE
// Generates Safe Pre-Filled WhatsApp URLs for Staff Workflows
// No Developer Account Required; Does Not Claim Fake Automated Delivery
// ====================================================================

import { normalizePhoneNumber } from '../phone/normalize'
import { buildQuestionnaireUrl } from '../navigation/urlRouter'
import { store } from '../services/store'
import { Message } from '../types/database'

export interface ClickToChatParams {
  businessId: string
  customerId: string
  visitId: string
  phone: string
  customerName?: string | null
  businessName: string
  tokenHash: string
  customMessageTemplate?: string
}

export interface ClickToChatResult {
  mobileUrl: string // https://wa.me/234...?text=...
  webUrl: string // https://web.whatsapp.com/send?phone=234...&text=...
  e164Phone: string
  digitsOnlyPhone: string
  prefilledText: string
  questionnaireUrl: string
  auditRecord: Message
}

/**
 * Standard neutral follow-up template conforming to communication ethics
 */
export const DEFAULT_WHATSAPP_INVITATION_TEMPLATE =
  'Hello {{customer_name}}, thank you for visiting {{business_name}}!\n\nWe\'d love your feedback - it only takes 60 seconds:\n{{questionnaire_link}}\n\nThank you!'

/**
 * Direct Google review invitation template for instant ratings
 */
export const DIRECT_GOOGLE_REVIEW_TEMPLATE =
  'Hello {{customer_name}}, thank you for visiting {{business_name}}!\n\nIf you enjoyed your visit today, could you take 30 seconds to leave us a quick review on Google?\n{{google_review_link}}\n\nThank you so much!'

/**
 * Formats a phone number for wa.me link (digits only, no '+' prefix or punctuation)
 */
export function formatPhoneForWhatsApp(rawPhone: string, defaultCountry = '+1'): {
  isValid: boolean
  digitsOnly: string
  e164: string
  error?: string
} {
  const norm = normalizePhoneNumber(rawPhone, defaultCountry)
  if (!norm.isValid) {
    return {
      isValid: false,
      digitsOnly: '',
      e164: '',
      error: norm.error || 'Invalid phone number format'
    }
  }

  // wa.me format requires international country code with no + sign, e.g. 2348031234567
  const digitsOnly = norm.e164.replace(/\D/g, '')

  return {
    isValid: true,
    digitsOnly,
    e164: norm.e164
  }
}

/**
 * Builds pre-filled message text safely interpolating tokens
 */
export function buildFollowupMessageText(
  template: string,
  customerName: string,
  businessName: string,
  questionnaireUrl: string,
  googleReviewUrl?: string | null
): string {
  const greetingName = customerName?.trim() || 'there'
  const effectiveReviewUrl = googleReviewUrl?.trim() || questionnaireUrl
  return template
    .replace(/\{\{customer_name\}\}/g, greetingName)
    .replace(/\{\{business_name\}\}/g, businessName)
    .replace(/\{\{questionnaire_link\}\}/g, questionnaireUrl)
    .replace(/\{\{google_review_link\}\}/g, effectiveReviewUrl)
}

/**
 * Generates official WhatsApp click-to-chat links and logs the manual workflow event
 */
export function generateWhatsAppClickToChat(params: ClickToChatParams): ClickToChatResult {
  const biz = store.getBusinessById(params.businessId)
  const defaultCountry = biz?.timezone === 'Africa/Lagos' ? '+234' : '+1'

  const phoneRes = formatPhoneForWhatsApp(params.phone, defaultCountry)
  if (!phoneRes.isValid) {
    throw new Error(phoneRes.error || 'Invalid customer phone number for WhatsApp link')
  }

  // Construct secure token questionnaire link
  const questionnaireUrl = buildQuestionnaireUrl(params.tokenHash)

  // Construct pre-filled text
  const template = params.customMessageTemplate || DEFAULT_WHATSAPP_INVITATION_TEMPLATE
  const prefilledText = buildFollowupMessageText(
    template,
    params.customerName || 'there',
    params.businessName,
    questionnaireUrl,
    biz?.google_review_url
  )

  const encodedText = encodeURIComponent(prefilledText)

  // Mobile deep link and desktop WhatsApp Web deep link
  const mobileUrl = `https://wa.me/${phoneRes.digitsOnly}?text=${encodedText}`
  const webUrl = `https://web.whatsapp.com/send?phone=${phoneRes.digitsOnly}&text=${encodedText}`

  // Log in message ledger accurately:
  // Status is queued / manual_click_to_chat, NEVER claiming fake automated delivery!
  const auditRecord: Message = {
    id: `msg_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    business_id: params.businessId,
    customer_id: params.customerId,
    visit_id: params.visitId,
    provider_message_id: null,
    template_name: 'manual_click_to_chat_v1',
    status: 'queued', // Accurately reflects waiting for staff to send
    failure_reason: 'Manual staff workflow: Message prepared for WhatsApp click-to-chat; delivery relies on staff manual tap.',
    idempotency_key: `manual_${params.visitId}_${Date.now()}`,
    sent_at: new Date().toISOString(),
    delivered_at: null, // Zero fabrication: delivery status not confirmed
    read_at: null,
    created_at: new Date().toISOString()
  }

  return {
    mobileUrl,
    webUrl,
    e164Phone: phoneRes.e164,
    digitsOnlyPhone: phoneRes.digitsOnly,
    prefilledText,
    questionnaireUrl,
    auditRecord
  }
}
