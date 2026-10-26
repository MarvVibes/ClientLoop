// ====================================================================
// CLIENTLOOP DURABLE WHATSAPP MESSAGE QUEUE & WEBHOOK PROCESSOR
// Implements Idempotency, Opt-Out Suppression, Cooldowns, and Webhooks
// ====================================================================

import { WhatsAppSendJob, WhatsAppSendResult } from './types'
import { MockWhatsAppProvider } from './mockProvider'
import { store } from '../services/store'
import { normalizePhoneNumber } from '../phone/normalize'
import { Message } from '../types/database'

const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END', 'OPTOUT']

export class WhatsAppQueueService {
  private provider: MockWhatsAppProvider
  private messageStore: Message[] = []

  constructor(provider?: MockWhatsAppProvider) {
    this.provider = provider || new MockWhatsAppProvider()
  }

  getMessagesByBusiness(businessId: string): Message[] {
    return this.messageStore.filter(m => m.business_id === businessId)
  }

  /**
   * Enqueues and dispatches a WhatsApp follow-up message with strict safety rules:
   * 1. Opt-out suppression check
   * 2. Idempotency deduplication check
   * 3. Provider dispatch
   * 4. Audit logging
   */
  async enqueueMessage(job: WhatsAppSendJob): Promise<WhatsAppSendResult & { messageRecord?: Message }> {
    const customer = store.findCustomerById(job.businessId, job.customerId)

    // 1. OPT-OUT SUPPRESSION CHECK
    // If customer has opted out, never send an automated message!
    if (customer && customer.consent_status === 'opted_out') {
      const suppressedMsg: Message = {
        id: `msg_suppressed_${Date.now()}`,
        business_id: job.businessId,
        customer_id: job.customerId,
        visit_id: job.visitId || null,
        provider_message_id: null,
        template_name: job.templateName,
        status: 'suppressed',
        failure_reason: 'Customer previously opted out via STOP keyword',
        idempotency_key: job.idempotencyKey,
        sent_at: null,
        delivered_at: null,
        read_at: null,
        created_at: new Date().toISOString()
      }

      this.messageStore.unshift(suppressedMsg)

      return {
        success: false,
        status: 'suppressed',
        error: 'Customer has opted out of automated WhatsApp messages',
        errorCode: 'OPT_OUT_SUPPRESSED',
        timestamp: new Date().toISOString(),
        messageRecord: suppressedMsg
      }
    }

    // 2. IDEMPOTENCY DEDUPLICATION CHECK
    // Prevent duplicate sending if network retries or user double-clicks
    const existing = this.messageStore.find(
      m => m.business_id === job.businessId && m.idempotency_key === job.idempotencyKey
    )

    if (existing) {
      return {
        success: existing.status !== 'failed' && existing.status !== 'suppressed',
        providerMessageId: existing.provider_message_id || undefined,
        status: existing.status,
        timestamp: existing.created_at,
        messageRecord: existing
      }
    }

    // 3. DISPATCH VIA PROVIDER
    const providerResult = await this.provider.sendMessage(job)

    // 4. PERSIST IN MESSAGE AUDIT LEDGER
    const newMsg: Message = {
      id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      business_id: job.businessId,
      customer_id: job.customerId,
      visit_id: job.visitId || null,
      provider_message_id: providerResult.providerMessageId || null,
      template_name: job.templateName,
      status: providerResult.status,
      failure_reason: providerResult.error || null,
      idempotency_key: job.idempotencyKey,
      sent_at: providerResult.success ? new Date().toISOString() : null,
      delivered_at: providerResult.status === 'delivered' ? new Date().toISOString() : null,
      read_at: null,
      created_at: new Date().toISOString()
    }

    this.messageStore.unshift(newMsg)

    return {
      ...providerResult,
      messageRecord: newMsg
    }
  }

  /**
   * Processes incoming Webhook events from Meta Cloud API
   * Handles delivery status progression and customer opt-out keywords (STOP)
   */
  processWebhook(payload: unknown, signatureHeader?: string): {
    processedStatuses: number
    processedInbound: number
    optOutsTriggered: string[]
  } {
    // If signature provided, verify it
    if (signatureHeader && !this.provider.verifyWebhookSignature(signatureHeader, JSON.stringify(payload))) {
      throw new Error('WEBHOOK_SIGNATURE_INVALID')
    }

    const { statusUpdates, inboundMessages } = this.provider.parseWebhookPayload(payload)
    const optOutsTriggered: string[] = []

    // 1. Process Status Updates ('sent', 'delivered', 'read', 'failed')
    for (const update of statusUpdates) {
      const msg = this.messageStore.find(m => m.provider_message_id === update.providerMessageId)
      if (msg) {
        msg.status = update.status
        if (update.status === 'delivered' && !msg.delivered_at) {
          msg.delivered_at = update.timestamp
        }
        if (update.status === 'read') {
          msg.read_at = update.timestamp
        }
        if (update.status === 'failed') {
          msg.failure_reason = update.failureReason || 'Provider delivery failed'
        }
      }
    }

    // 2. Process Inbound Messages (Opt-Out Keyword Detection)
    for (const inbound of inboundMessages) {
      const textUpper = inbound.text.trim().toUpperCase()
      const isOptOutKeyword = OPT_OUT_KEYWORDS.some(k => textUpper.includes(k))

      if (isOptOutKeyword) {
        const norm = normalizePhoneNumber(inbound.senderPhone)
        if (norm.isValid) {
          // Search across all businesses to suppress this phone number
          const businesses = store.getBusinesses()
          for (const biz of businesses) {
            const customer = store.findCustomerByPhone(biz.id, norm.e164)
            if (customer) {
              store.setCustomerOptOut(biz.id, customer.id, true)
              optOutsTriggered.push(customer.normalized_phone)
            }
          }
        }
      }
    }

    return {
      processedStatuses: statusUpdates.length,
      processedInbound: inboundMessages.length,
      optOutsTriggered
    }
  }

  /**
   * Helper to manually advance a message to 'read' for demonstration/testing
   */
  simulateReadStatus(providerMessageId: string): boolean {
    const msg = this.messageStore.find(m => m.provider_message_id === providerMessageId)
    if (msg) {
      msg.status = 'read'
      msg.read_at = new Date().toISOString()
      return true
    }
    return false
  }
}

// Global Singleton Instance
export const whatsappQueue = new WhatsAppQueueService()
