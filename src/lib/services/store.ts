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
  AuditEvent
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

// Seed Data: 1. Pilot Business (Paso Elite) and 2. Apex Wellness
export const INITIAL_BUSINESSES: Business[] = [
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

export const INITIAL_CUSTOMERS: Customer[] = [
  // Paso Elite Customer
  {
    id: 'cust_paso_1',
    business_id: 'biz_paso_elite',
    name: 'Emeka Okon',
    normalized_phone: '+2348031234567',
    country_code: '+234',
    first_discovery_source: 'Friend or Family Recommendation',
    consent_status: 'implicit_transaction',
    opted_out_at: null,
    notes: 'Prefers scissors over clippers on top.',
    first_seen_at: new Date('2026-10-19T10:00:00Z').toISOString(),
    last_seen_at: new Date('2026-10-21T14:30:00Z').toISOString(),
    created_at: new Date('2026-10-19T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-21T14:30:00Z').toISOString()
  },
  // Apex Wellness Customer
  {
    id: 'cust_apex_1',
    business_id: 'biz_apex_wellness',
    name: 'Maya Lin',
    normalized_phone: '+15550192834',
    country_code: '+1',
    first_discovery_source: 'Google Maps Search',
    consent_status: 'implicit_transaction',
    opted_out_at: null,
    notes: 'Sensitive skin. Elena is primary therapist.',
    first_seen_at: new Date('2026-09-15T11:00:00Z').toISOString(),
    last_seen_at: new Date('2026-10-21T15:15:00Z').toISOString(),
    created_at: new Date('2026-09-15T11:00:00Z').toISOString(),
    updated_at: new Date('2026-10-21T15:15:00Z').toISOString()
  }
]

export const INITIAL_VISITS: Visit[] = [
  {
    id: 'visit_p1',
    business_id: 'biz_paso_elite',
    customer_id: 'cust_paso_1',
    service: 'Signature Haircut & Beard Grooming',
    service_id: 'srv_p1',
    staff_user_id: 'staff_ugo',
    status: 'completed',
    questionnaire_status: 'submitted',
    visit_timestamp: new Date('2026-10-19T10:30:00Z').toISOString(),
    created_at: new Date('2026-10-19T10:30:00Z').toISOString(),
    updated_at: new Date('2026-10-19T11:15:00Z').toISOString()
  },
  {
    id: 'visit_p2',
    business_id: 'biz_paso_elite',
    customer_id: 'cust_paso_1',
    service: 'Signature Haircut & Beard Grooming',
    service_id: 'srv_p1',
    staff_user_id: 'staff_ugo',
    status: 'completed',
    questionnaire_status: 'sent',
    visit_timestamp: new Date('2026-10-21T14:30:00Z').toISOString(),
    created_at: new Date('2026-10-21T14:30:00Z').toISOString(),
    updated_at: new Date('2026-10-21T14:30:00Z').toISOString()
  },
  {
    id: 'visit_a1',
    business_id: 'biz_apex_wellness',
    customer_id: 'cust_apex_1',
    service: 'Custom HydraFacial & Peel',
    service_id: 'srv_a1',
    staff_user_id: 'staff_elena',
    status: 'completed',
    questionnaire_status: 'submitted',
    visit_timestamp: new Date('2026-10-21T15:15:00Z').toISOString(),
    created_at: new Date('2026-10-21T15:15:00Z').toISOString(),
    updated_at: new Date('2026-10-21T15:45:00Z').toISOString()
  }
]

export const INITIAL_TOKENS: QuestionnaireToken[] = [
  {
    id: 'tok_demo_paso_2026',
    business_id: 'biz_paso_elite',
    visit_id: 'visit_p2',
    customer_id: 'cust_paso_1',
    token_hash: 'demo_paso_token_2026',
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    consumed_at: null,
    revoked_at: null,
    created_at: new Date().toISOString()
  }
]

const STORAGE_KEY = 'clientloop_store_v1'

// In-Memory & LocalStorage Repository State
class ClientLoopStore {
  private businesses: Business[] = [...INITIAL_BUSINESSES]
  private customers: Customer[] = [...INITIAL_CUSTOMERS]
  private visits: Visit[] = [...INITIAL_VISITS]
  private tokens: QuestionnaireToken[] = [...INITIAL_TOKENS]
  private submissions: QuestionnaireSubmission[] = []
  private messages: Message[] = []
  private reviewActivities: ReviewActivity[] = []
  private auditEvents: AuditEvent[] = []

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
        auditEvents: this.auditEvents
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
      id: `cust_${Math.random().toString(36).substring(2, 10)}`,
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
      id: `visit_${Math.random().toString(36).substring(2, 10)}`,
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
        id: `msg_${Math.random().toString(36).substring(2, 8)}`,
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
      id: `tok_${Math.random().toString(36).substring(2, 10)}`,
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

  submitQuestionnaire(
    tokenHash: string,
    answers: {
      firstVisitAnswer: boolean
      discoverySourceAnswer: string
      discoverySourceClarification?: string | null
      serviceAnswer: string
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
      id: `sub_${Math.random().toString(36).substring(2, 10)}`,
      business_id: token.business_id,
      visit_id: token.visit_id,
      customer_id: token.customer_id,
      token_id: token.id,
      first_visit_answer: answers.firstVisitAnswer,
      discovery_source_answer: answers.discoverySourceAnswer,
      discovery_source_clarification: answers.discoverySourceClarification || null,
      service_answer: answers.serviceAnswer,
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

    // Update customer discovery source if unset
    const customer = this.customers.find(c => c.id === token.customer_id)
    if (customer && !customer.first_discovery_source) {
      customer.first_discovery_source = answers.discoverySourceAnswer
      supabaseService.persistCustomer(customer)
    }

    this.persist()
    supabaseService.persistSubmission(submission, tokenHash)
    return { success: true, submission }
  }

  // --- REVIEW CLICKS & INVITATION EVENTS ---
  recordReviewInvitationShown(businessId: string, customerId?: string, visitId?: string): ReviewActivity {
    const event: ReviewActivity = {
      id: `rev_inv_${Math.random().toString(36).substring(2, 10)}`,
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
      id: `rev_clk_${Math.random().toString(36).substring(2, 10)}`,
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
      id: `aud_${Math.random().toString(36).substring(2, 10)}`,
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
}

// Global Singleton Instance
export const store = new ClientLoopStore()
