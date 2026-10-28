// ====================================================================
// CLIENTLOOP MULTI-TENANT LOCAL & REPOSITORY STORE
// In-Memory & LocalStorage Service Layer with RLS Invariants
// ====================================================================

import { 
  Business, 
  Customer, 
  Visit, 
  QuestionnaireToken, 
  QuestionnaireSubmission,
  Message,
  ReviewActivity,
  AuditEvent,
  TeamMember,
  WorkspaceRole
} from '../types/database'
import { normalizePhoneNumber } from '../phone/normalize'
import { supabaseService } from '../supabase/service'

export const DEFAULT_DISCOVERY_SOURCES = [
  'Google Search',
  'Google Maps',
  'Instagram',
  'Facebook',
  'TikTok',
  'WhatsApp',
  'Friend or family referral',
  'Walk-by or saw the business location',
  'Returning customer or existing relationship',
  'Other',
  'Prefer not to say'
]

/**
 * Universal RFC4122 v4 UUID generator compliant with PostgreSQL UUID constraints
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Test fixture businesses retained strictly for development / automated test execution
export const TEST_FIXTURE_BUSINESSES: Business[] = [
  {
    id: 'biz_paso_elite',
    name: 'Paso Elite Unisex Salon',
    slug: 'paso-elite-salon',
    category: 'Hair Salon & Barbershop',
    timezone: 'Africa/Lagos',
    address: 'No. 6 Itu Road, Uyo, Akwa Ibom, Nigeria',
    google_review_url: 'https://maps.google.com/?cid=sample_paso_elite',
    branding: {
      primary_color: '#2563EB',
      logo_url: null
    },
    services: [
      { id: 'srv_p1', name: 'Signature Haircut & Beard Grooming', default_price: 5000, default_duration_min: 45 },
      { id: 'srv_p2', name: 'Custom Dreadlocks Locking & Styling', default_price: 15000, default_duration_min: 90 },
      { id: 'srv_p3', name: 'Hair Washing & Deep Scalp Treatment', default_price: 7000, default_duration_min: 60 },
      { id: 'srv_p4', name: 'Braids & Weaving', default_price: 12000, default_duration_min: 120 },
      { id: 'srv_p5', name: 'Pedicure & Foot Reflexology', default_price: 6000, default_duration_min: 45 }
    ],
    discovery_source_options: [...DEFAULT_DISCOVERY_SOURCES],
    messaging_config: {
      provider: 'manual_click_to_chat',
      cooldown_hours: 72,
      auto_send_on_visit: true,
      whatsapp_phone_number_id: null
    },
    created_at: new Date('2026-10-19T08:00:00Z').toISOString(),
    updated_at: new Date('2026-10-19T08:00:00Z').toISOString()
  },
  {
    id: 'biz_apex_wellness',
    name: 'Apex Wellness & Aesthetics',
    slug: 'apex-wellness',
    category: 'Medspa & Aesthetics',
    timezone: 'America/New_York',
    address: '450 Lexington Ave, Suite 1200, New York, NY',
    google_review_url: 'https://maps.google.com/?cid=sample_apex_wellness',
    branding: {
      primary_color: '#0D9488',
      logo_url: null
    },
    services: [
      { id: 'srv_a1', name: 'Custom HydraFacial & Peel', default_price: 165, default_duration_min: 60 },
      { id: 'srv_a2', name: 'Deep Tissue Recovery Therapy', default_price: 145, default_duration_min: 75 },
      { id: 'srv_a3', name: 'Skin Health Consultation', default_price: 85, default_duration_min: 30 },
      { id: 'srv_a4', name: 'Cryotherapy Recovery Session', default_price: 65, default_duration_min: 30 }
    ],
    discovery_source_options: [...DEFAULT_DISCOVERY_SOURCES],
    messaging_config: {
      provider: 'manual_click_to_chat',
      cooldown_hours: 72,
      auto_send_on_visit: true,
      whatsapp_phone_number_id: null
    },
    created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:00:00Z').toISOString()
  }
]

// Environment detection for test execution vs production SaaS runtime
const proc = (globalThis as unknown as { process?: { env?: Record<string, string>; argv?: string[] } }).process
const isNodeTest = Boolean(
  proc && (
    proc.env?.NODE_ENV === 'test' ||
    proc.env?.npm_lifecycle_event === 'test' ||
    proc.argv?.some((arg: string) => arg.includes('test'))
  )
)

// In production, starts empty. Only test runner receives fixtures.
export const INITIAL_BUSINESSES: Business[] = isNodeTest ? [...TEST_FIXTURE_BUSINESSES] : []
export const INITIAL_CUSTOMERS: Customer[] = []
export const INITIAL_VISITS: Visit[] = []
export const INITIAL_TOKENS: QuestionnaireToken[] = []

// Bumped to v3 to ensure clean storage
const STORAGE_KEY = 'clientloop_store_v3'

// In-Memory & LocalStorage Repository State
class ClientLoopStore {
  private businesses: Business[] = [...INITIAL_BUSINESSES]
  private customers: Customer[] = []
  private visits: Visit[] = []
  private tokens: QuestionnaireToken[] = []
  private submissions: QuestionnaireSubmission[] = []
  private messages: Message[] = []
  private reviewActivities: ReviewActivity[] = []
  private auditEvents: AuditEvent[] = []
  private teamMembers: TeamMember[] = []

  constructor() {
    this.loadFromStorage()
    this.syncFromSupabase()
  }

  async syncFromSupabase(): Promise<void> {
    try {
      const remoteBiz = await supabaseService.fetchRemoteBusinesses()
      if (remoteBiz && remoteBiz.length > 0) {
        // Merge businesses
        for (const b of remoteBiz) {
          const idx = this.businesses.findIndex(local => local.id === b.id || local.slug === b.slug)
          if (idx >= 0) {
            this.businesses[idx] = { ...this.businesses[idx], ...b }
          } else {
            this.businesses.push(b)
          }

          // Fetch remote visits, customers, submissions
          const custs = await supabaseService.fetchRemoteCustomers(b.id)
          if (custs && custs.length > 0) {
            for (const c of custs) {
              if (!this.customers.some(local => local.id === c.id)) {
                this.customers.push(c)
              }
            }
          }

          const visits = await supabaseService.fetchRemoteVisits(b.id)
          if (visits && visits.length > 0) {
            for (const v of visits) {
              if (!this.visits.some(local => local.id === v.id)) {
                this.visits.push(v)
              }
            }
          }

          const subs = await supabaseService.fetchRemoteSubmissions(b.id)
          if (subs && subs.length > 0) {
            for (const s of subs) {
              if (!this.submissions.some(local => local.id === s.id)) {
                this.submissions.push(s)
              }
            }
          }

          const revs = await supabaseService.fetchRemoteReviewActivity(b.id)
          if (revs && revs.length > 0) {
            for (const r of revs) {
              if (!this.reviewActivities.some(local => local.id === r.id)) {
                this.reviewActivities.push(r)
              }
            }
          }
        }
        this.persist()
      }
    } catch {
      // Offline fallback: keep local store
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.businesses) && parsed.businesses.length) this.businesses = parsed.businesses
        if (Array.isArray(parsed.customers) && parsed.customers.length) this.customers = parsed.customers
        if (Array.isArray(parsed.visits) && parsed.visits.length) this.visits = parsed.visits
        if (Array.isArray(parsed.tokens) && parsed.tokens.length) this.tokens = parsed.tokens
        if (Array.isArray(parsed.submissions)) this.submissions = parsed.submissions
        if (Array.isArray(parsed.messages)) this.messages = parsed.messages
        if (Array.isArray(parsed.reviewActivities)) this.reviewActivities = parsed.reviewActivities
        if (Array.isArray(parsed.auditEvents)) this.auditEvents = parsed.auditEvents
        if (Array.isArray(parsed.teamMembers)) this.teamMembers = parsed.teamMembers
      }
    } catch {
      // Ignore storage read error, fallback to initial state
    }
  }

  private persist() {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        businesses: this.businesses,
        customers: this.customers,
        visits: this.visits,
        tokens: this.tokens,
        submissions: this.submissions,
        messages: this.messages,
        reviewActivities: this.reviewActivities,
        auditEvents: this.auditEvents,
        teamMembers: this.teamMembers
      }))
    } catch {
      // Ignore storage write error
    }
  }

  resetToSeedData() {
    this.businesses = [...INITIAL_BUSINESSES]
    this.customers = [...INITIAL_CUSTOMERS]
    this.visits = [...INITIAL_VISITS]
    this.tokens = [...INITIAL_TOKENS]
    this.submissions = []
    this.messages = []
    this.reviewActivities = []
    this.auditEvents = []
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  // --- BUSINESS TENANCY ---
  getBusinesses(): Business[] {
    return [...this.businesses]
  }

  getBusinessById(id: string): Business | undefined {
    return this.businesses.find(b => b.id === id)
  }

  createBusiness(biz: Business): Business {
    const existing = this.businesses.find(b => b.id === biz.id)
    if (existing) {
      Object.assign(existing, biz)
      this.persist()
      return existing
    }
    this.businesses.push(biz)
    this.persist()
    return biz
  }

  // --- CUSTOMER MANAGEMENT (STRICTLY SCOPED TO BUSINESS_ID) ---
  getCustomersByBusiness(businessId: string): Customer[] {
    return this.customers.filter(c => c.business_id === businessId)
  }

  findCustomerByPhone(businessId: string, normalizedPhone: string): Customer | undefined {
    return this.customers.find(
      c => c.business_id === businessId && c.normalized_phone === normalizedPhone
    )
  }

  findCustomerById(businessId: string, customerId: string): Customer | undefined {
    return this.customers.find(c => c.business_id === businessId && c.id === customerId)
  }

  createOrUpdateCustomer(
    businessId: string,
    data: {
      name?: string | null
      phone: string
      countryCode?: string
      notes?: string | null
      firstDiscoverySource?: string | null
      consentStatus?: 'implicit_transaction' | 'explicit_oral' | 'explicit_written' | 'opted_out'
    }
  ): { customer: Customer; isNew: boolean } {
    const biz = this.getBusinessById(businessId)
    const defaultCountry = biz?.timezone === 'Africa/Lagos' ? '+234' : (data.countryCode || '+1')
    const normalized = normalizePhoneNumber(data.phone, defaultCountry)

    if (!normalized.isValid) {
      throw new Error(normalized.error || 'Invalid phone format')
    }

    // Search strictly within this business!
    const existing = this.findCustomerByPhone(businessId, normalized.e164)

    if (existing) {
      if (data.name && (!existing.name || existing.name !== data.name)) {
        existing.name = data.name
      }
      if (data.notes) {
        existing.notes = data.notes
      }
      existing.last_seen_at = new Date().toISOString()
      existing.updated_at = new Date().toISOString()
      this.persist()
      supabaseService.persistCustomer(existing)
      return { customer: existing, isNew: false }
    }

    const newCustomer: Customer = {
      id: generateUuid(),
      business_id: businessId,
      name: data.name || null,
      normalized_phone: normalized.e164,
      country_code: normalized.countryCode,
      first_discovery_source: data.firstDiscoverySource || null,
      consent_status: data.consentStatus || 'implicit_transaction',
      opted_out_at: null,
      notes: data.notes || null,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    this.customers.unshift(newCustomer)
    this.persist()
    supabaseService.persistCustomer(newCustomer)
    return { customer: newCustomer, isNew: true }
  }

  setCustomerOptOut(businessId: string, customerId: string, optedOut: boolean): Customer {
    const cust = this.findCustomerById(businessId, customerId)
    if (!cust) throw new Error('Customer not found in this workspace')

    cust.consent_status = optedOut ? 'opted_out' : 'explicit_oral'
    cust.opted_out_at = optedOut ? new Date().toISOString() : null
    cust.updated_at = new Date().toISOString()
    this.persist()
    supabaseService.persistCustomer(cust)
    return cust
  }

  // --- VISIT MANAGEMENT ---
  getVisitsByBusiness(businessId: string): Visit[] {
    return this.visits.filter(v => v.business_id === businessId)
  }

  getCustomerVisits(businessId: string, customerId: string): Visit[] {
    return this.visits.filter(v => v.business_id === businessId && v.customer_id === customerId)
  }

  recordVisit(
    businessId: string,
    data: {
      customerId: string
      service: string
      serviceId?: string | null
      staffUserId?: string | null
      sendQuestionnaire?: boolean
    }
  ): { visit: Visit; isReturningClient: boolean; token?: QuestionnaireToken } {
    const customer = this.findCustomerById(businessId, data.customerId)
    if (!customer) throw new Error('Customer does not belong to this business workspace')

    // System calculation: Check prior visits count in this business
    const priorVisits = this.getCustomerVisits(businessId, data.customerId)
    const isReturningClient = priorVisits.length > 0

    const newVisit: Visit = {
      id: generateUuid(),
      business_id: businessId,
      customer_id: data.customerId,
      service: data.service,
      service_id: data.serviceId || null,
      staff_user_id: data.staffUserId || null,
      status: 'completed',
      questionnaire_status: data.sendQuestionnaire ? 'queued' : 'none',
      visit_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    this.visits.unshift(newVisit)

    // Update customer last seen timestamp
    customer.last_seen_at = new Date().toISOString()

    let token: QuestionnaireToken | undefined

    if (data.sendQuestionnaire && customer.consent_status !== 'opted_out') {
      token = this.createQuestionnaireToken(businessId, newVisit.id, customer.id)
      newVisit.questionnaire_status = 'sent'

      // Log mock message in queue
      this.messages.unshift({
        id: generateUuid(),
        business_id: businessId,
        customer_id: customer.id,
        visit_id: newVisit.id,
        provider_message_id: `wamid.HBgL${Math.random().toString(36).substring(2, 12)}`,
        template_name: 'post_visit_followup_v2',
        status: 'delivered',
        failure_reason: null,
        idempotency_key: `send_${newVisit.id}`,
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        read_at: null,
        created_at: new Date().toISOString()
      })
    }

    this.persist()
    supabaseService.persistVisit(newVisit)
    if (token) {
      supabaseService.persistToken(token)
    }
    return { visit: newVisit, isReturningClient, token }
  }

  // --- SECURE QUESTIONNAIRE TOKENS ---
  createQuestionnaireToken(businessId: string, visitId: string, customerId: string): QuestionnaireToken {
    // Generate random 32-character hexadecimal token hash
    const array = new Uint8Array(16)
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    const tokenHash = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

    const token: QuestionnaireToken = {
      id: generateUuid(),
      business_id: businessId,
      visit_id: visitId,
      customer_id: customerId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hour expiry
      consumed_at: null,
      revoked_at: null,
      created_at: new Date().toISOString()
    }

    this.tokens.push(token)
    this.persist()
    supabaseService.persistToken(token)
    return token
  }

  findTokenByHash(tokenHash: string): QuestionnaireToken | undefined {
    return this.tokens.find(t => t.token_hash === tokenHash)
  }

  findTokenByVisitId(visitId: string): QuestionnaireToken | undefined {
    return this.tokens.find(t => t.visit_id === visitId)
  }

  /**
   * Hydrates remote public questionnaire context into local cache
   * Ensures instant offline resilience and smooth form submission
   */
  hydrateTokenContext(ctx: {
    tokenId: string
    businessId: string
    businessName: string
    tokenHash: string
    expiresAt: string
    googleReviewUrl?: string | null
    services?: Array<{ id: string; name: string; default_price?: number; default_duration_min?: number }>
    discoverySourceOptions?: string[]
    customerFirstName?: string
    visitService?: string
  }): void {
    // 1. Ensure business exists in local cache
    let biz = this.getBusinessById(ctx.businessId)
    if (!biz) {
      biz = {
        id: ctx.businessId,
        name: ctx.businessName,
        slug: ctx.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        category: 'Service Business',
        timezone: 'Africa/Lagos',
        address: '',
        google_review_url: ctx.googleReviewUrl || null,
        branding: { primary_color: '#2563EB', logo_url: null },
        services: ctx.services?.length ? ctx.services : [{ id: generateUuid(), name: ctx.visitService || 'Standard Service' }],
        discovery_source_options: ctx.discoverySourceOptions?.length ? ctx.discoverySourceOptions : [...DEFAULT_DISCOVERY_SOURCES],
        messaging_config: { provider: 'manual_click_to_chat', cooldown_hours: 72, auto_send_on_visit: false, whatsapp_phone_number_id: null },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      this.businesses.push(biz)
    } else if (ctx.googleReviewUrl && !biz.google_review_url) {
      biz.google_review_url = ctx.googleReviewUrl
    }

    // 2. Ensure customer placeholder exists
    let cust = this.customers.find(c => c.business_id === ctx.businessId && c.name === (ctx.customerFirstName || 'Guest'))
    if (!cust) {
      const newCust: Customer = {
        id: generateUuid(),
        business_id: ctx.businessId,
        name: ctx.customerFirstName || 'Guest',
        normalized_phone: '+00000000000',
        country_code: '+0',
        first_discovery_source: null,
        consent_status: 'implicit_transaction',
        opted_out_at: null,
        notes: null,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      this.customers.push(newCust)
      cust = newCust
    }

    // 3. Ensure visit placeholder exists
    let visit = this.visits.find(v => v.business_id === ctx.businessId && v.customer_id === cust.id)
    if (!visit) {
      visit = {
        id: generateUuid(),
        business_id: ctx.businessId,
        customer_id: cust.id,
        service: ctx.visitService || 'General Service',
        service_id: null,
        staff_user_id: null,
        status: 'completed',
        questionnaire_status: 'sent',
        visit_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      this.visits.push(visit)
    }

    // 4. Ensure token exists
    let tok = this.findTokenByHash(ctx.tokenHash)
    if (!tok) {
      tok = {
        id: ctx.tokenId,
        business_id: ctx.businessId,
        visit_id: visit.id,
        customer_id: cust.id,
        token_hash: ctx.tokenHash,
        expires_at: ctx.expiresAt,
        consumed_at: null,
        revoked_at: null,
        created_at: new Date().toISOString()
      }
      this.tokens.push(tok)
    }
    this.persist()
  }

  submitQuestionnaire(
    tokenHash: string,
    answers: {
      customerName?: string | null
      firstVisitAnswer: boolean
      discoverySourceAnswer: string
      discoverySourceClarification?: string | null
      serviceAnswer?: string
      rating?: number | null
      feedbackText?: string | null
    }
  ): { success: boolean; submission?: QuestionnaireSubmission; error?: string } {
    const token = this.findTokenByHash(tokenHash)

    if (!token) {
      return { success: false, error: 'INVALID_TOKEN' }
    }
    if (token.revoked_at) {
      return { success: false, error: 'TOKEN_REVOKED' }
    }
    if (token.consumed_at) {
      return { success: false, error: 'ALREADY_SUBMITTED' }
    }
    if (new Date(token.expires_at) < new Date()) {
      return { success: false, error: 'TOKEN_EXPIRED' }
    }

    // Check if visit already has submission (Idempotency)
    const existingSubmission = this.submissions.find(s => s.visit_id === token.visit_id)
    if (existingSubmission) {
      return { success: false, error: 'DUPLICATE_SUBMISSION' }
    }

    const submission: QuestionnaireSubmission = {
      id: generateUuid(),
      business_id: token.business_id,
      visit_id: token.visit_id,
      customer_id: token.customer_id,
      token_id: token.id,
      first_visit_answer: answers.firstVisitAnswer,
      discovery_source_answer: answers.discoverySourceAnswer,
      discovery_source_clarification: answers.discoverySourceClarification || null,
      service_answer: answers.serviceAnswer || 'General Service',
      rating: answers.rating || null,
      feedback_text: answers.feedbackText || null,
      ip_hash: null,
      submitted_at: new Date().toISOString()
    }

    this.submissions.unshift(submission)

    // Mark token as consumed
    token.consumed_at = new Date().toISOString()

    // Update visit questionnaire status
    const visit = this.visits.find(v => v.id === token.visit_id)
    if (visit) {
      visit.questionnaire_status = 'submitted'
      visit.updated_at = new Date().toISOString()
      supabaseService.persistVisit(visit)
    }

    // Update customer name and discovery source
    const customer = this.customers.find(c => c.id === token.customer_id)
    if (customer) {
      let customerChanged = false
      if (answers.customerName && answers.customerName.trim() && customer.name !== answers.customerName.trim()) {
        customer.name = answers.customerName.trim()
        customerChanged = true
      }
      if (!customer.first_discovery_source && answers.discoverySourceAnswer) {
        customer.first_discovery_source = answers.discoverySourceAnswer
        customerChanged = true
      }
      if (customerChanged) {
        customer.updated_at = new Date().toISOString()
        supabaseService.persistCustomer(customer)
      }
    }

    this.persist()
    supabaseService.persistSubmission(submission, tokenHash)
    return { success: true, submission }
  }

  // --- REVIEW CLICKS & INVITATION EVENTS ---
  recordReviewInvitationShown(businessId: string, customerId?: string, visitId?: string): ReviewActivity {
    const event: ReviewActivity = {
      id: generateUuid(),
      business_id: businessId,
      customer_id: customerId || null,
      visit_id: visitId || null,
      event_type: 'invitation_shown',
      source: 'thank_you_page',
      verification_level: 'unverified_click',
      review_count_snapshot: null,
      created_at: new Date().toISOString()
    }

    this.reviewActivities.unshift(event)
    this.persist()
    supabaseService.persistReviewActivity(event)
    return event
  }

  recordReviewClick(businessId: string, customerId?: string, visitId?: string): ReviewActivity {
    const event: ReviewActivity = {
      id: generateUuid(),
      business_id: businessId,
      customer_id: customerId || null,
      visit_id: visitId || null,
      event_type: 'link_clicked',
      source: 'thank_you_page',
      verification_level: 'unverified_click',
      review_count_snapshot: null,
      created_at: new Date().toISOString()
    }

    this.reviewActivities.unshift(event)
    this.persist()
    supabaseService.persistReviewActivity(event)
    return event
  }

  getReviewActivities(businessId: string): ReviewActivity[] {
    return this.reviewActivities.filter(r => r.business_id === businessId)
  }

  getSubmissionsByBusiness(businessId: string): QuestionnaireSubmission[] {
    return this.submissions.filter(s => s.business_id === businessId)
  }

  // --- MESSAGING & WHATSAPP DISPATCH ---
  getMessagesByBusiness(businessId: string): Message[] {
    return this.messages.filter(m => m.business_id === businessId)
  }

  recordWhatsAppDispatch(
    businessId: string,
    visitId: string,
    customerId: string,
    channel: 'wa_me' | 'whatsapp_web' | 'whatsapp_app'
  ): Message {
    let msg = this.messages.find(m => m.business_id === businessId && m.visit_id === visitId)
    if (msg) {
      msg.status = 'delivered'
      msg.sent_at = msg.sent_at || new Date().toISOString()
      msg.delivered_at = new Date().toISOString()
    } else {
      msg = {
        id: generateUuid(),
        business_id: businessId,
        customer_id: customerId,
        visit_id: visitId,
        provider_message_id: `manual_${Date.now()}`,
        template_name: 'post_visit_followup_v2',
        status: 'delivered',
        failure_reason: null,
        idempotency_key: `dispatch_${visitId}`,
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        read_at: null,
        created_at: new Date().toISOString()
      }
      this.messages.unshift(msg)
    }

    this.recordAuditEvent(businessId, 'staff_user', 'whatsapp_dispatch', 'messages', {
      visitId,
      customerId,
      channel
    })
    this.persist()
    return msg
  }

  markMessageDispatched(visitId: string): void {
    const msg = this.messages.find(m => m.visit_id === visitId)
    if (msg) {
      msg.status = 'delivered'
      msg.sent_at = msg.sent_at || new Date().toISOString()
      msg.delivered_at = new Date().toISOString()
      this.persist()
    }
  }

  // --- BUSINESS SETTINGS UPDATE ---
  updateBusinessSettings(businessId: string, updates: Partial<Business>): Business {
    const biz = this.getBusinessById(businessId)
    if (!biz) throw new Error('Business workspace not found')

    Object.assign(biz, {
      ...updates,
      updated_at: new Date().toISOString()
    })

    this.recordAuditEvent(businessId, 'system_user', 'update_business_settings', businessId, {
      updatedFields: Object.keys(updates)
    })

    this.persist()
    supabaseService.persistBusinessSettings(businessId, updates)
    return biz
  }

  // --- AUDIT EVENTS ---
  recordAuditEvent(
    businessId: string,
    actorUserId: string,
    action: string,
    recordType: string,
    metadata: Record<string, unknown> = {}
  ): AuditEvent {
    const event: AuditEvent = {
      id: generateUuid(),
      business_id: businessId,
      actor_user_id: actorUserId,
      action,
      record_type: recordType,
      record_id: null,
      metadata,
      created_at: new Date().toISOString()
    }
    this.auditEvents.unshift(event)
    return event
  }

  getAuditEventsByBusiness(businessId: string): AuditEvent[] {
    return this.auditEvents.filter(a => a.business_id === businessId)
  }

  // --- TEAM & STAFF MANAGEMENT (RBAC) ---
  getTeamMembers(businessId: string): TeamMember[] {
    const members = this.teamMembers.filter(m => m.business_id === businessId)
    if (members.length === 0) {
      const biz = this.getBusinessById(businessId)
      const defaultAdmin: TeamMember = {
        id: generateUuid(),
        business_id: businessId,
        name: 'Workspace Admin',
        email: 'admin@' + (biz?.slug || 'workspace') + '.com',
        phone: null,
        role: 'owner',
        status: 'active',
        created_at: biz?.created_at || new Date().toISOString()
      }
      this.teamMembers.push(defaultAdmin)
      this.persist()
      return [defaultAdmin]
    }
    return members
  }

  addTeamMember(
    businessId: string,
    data: { name: string; email: string; phone?: string | null; role: WorkspaceRole }
  ): TeamMember {
    const member: TeamMember = {
      id: generateUuid(),
      business_id: businessId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      role: data.role,
      status: 'active',
      created_at: new Date().toISOString()
    }
    this.teamMembers.push(member)
    this.recordAuditEvent(businessId, 'admin_user', 'add_team_member', 'team_members', {
      memberId: member.id,
      email: member.email,
      role: member.role
    })
    this.persist()
    return member
  }

  updateTeamMemberRole(businessId: string, memberId: string, role: WorkspaceRole): void {
    const member = this.teamMembers.find(m => m.business_id === businessId && m.id === memberId)
    if (member) {
      member.role = role
      this.recordAuditEvent(businessId, 'admin_user', 'update_team_role', 'team_members', {
        memberId,
        newRole: role
      })
      this.persist()
    }
  }

  removeTeamMember(businessId: string, memberId: string): void {
    this.teamMembers = this.teamMembers.filter(m => !(m.business_id === businessId && m.id === memberId))
    this.recordAuditEvent(businessId, 'admin_user', 'remove_team_member', 'team_members', { memberId })
    this.persist()
  }

  // --- CONFIRMED GOOGLE REVIEWS MANAGEMENT ---
  getManualReviewCount(businessId: string): number {
    const biz = this.getBusinessById(businessId)
    return biz?.manual_review_count || 0
  }

  setManualReviewCount(businessId: string, count: number): number {
    const biz = this.getBusinessById(businessId)
    if (biz) {
      biz.manual_review_count = Math.max(0, count)
      this.persist()
      return biz.manual_review_count
    }
    return count
  }

  incrementManualReviewCount(businessId: string, delta = 1): number {
    const biz = this.getBusinessById(businessId)
    if (biz) {
      biz.manual_review_count = Math.max(0, (biz.manual_review_count || 0) + delta)
      this.persist()
      return biz.manual_review_count
    }
    return 0
  }
}

// Global Singleton Instance
export const store = new ClientLoopStore()
