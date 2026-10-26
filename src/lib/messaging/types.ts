// ====================================================================
// CLIENTLOOP WHATSAPP MESSAGING TYPES & PROVIDER INTERFACE
// Conforming to Meta WhatsApp Business Platform Cloud API Standards
// ====================================================================

export type MessageDeliveryStatus = 
  | 'queued' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed' 
  | 'suppressed'

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters: {
    type: 'text' | 'currency' | 'date_time'
    text?: string
  }[]
}

export interface WhatsAppSendJob {
  businessId: string
  customerId: string
  visitId?: string | null
  recipientPhone: string // Normalized E.164 phone (e.g. +2348031234567)
  templateName: string
  templateLanguage?: string // Defaults to 'en'
  parameters: Record<string, string> // e.g. { customer_name: 'Maya', business_name: 'Apex', form_link: '...' }
  idempotencyKey: string // Unique key preventing double sending
}

export interface WhatsAppSendResult {
  success: boolean
  providerMessageId?: string
  status: MessageDeliveryStatus
  error?: string
  errorCode?: string
  timestamp: string
}

export interface WebhookStatusUpdate {
  providerMessageId: string
  recipientPhone: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  failureReason?: string
}

export interface WebhookInboundMessage {
  providerMessageId: string
  senderPhone: string
  text: string
  timestamp: string
}

export interface ParsedWebhookEvents {
  statusUpdates: WebhookStatusUpdate[]
  inboundMessages: WebhookInboundMessage[]
}

export interface WhatsAppProvider {
  name: string
  sendMessage(job: WhatsAppSendJob): Promise<WhatsAppSendResult>
  verifyWebhookSignature(signature: string, rawPayload: string): boolean
  parseWebhookPayload(payload: unknown): ParsedWebhookEvents
}
