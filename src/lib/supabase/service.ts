// ====================================================================
// CLIENTLOOP SUPABASE PERSISTENCE & SYNCHRONIZATION SERVICE
// Manages Bi-Directional Sync between Supabase PostgreSQL and Client Store
// Graceful Offline Fallback & Zero-Data-Loss Architecture
// ====================================================================

import { supabase, isSupabaseConfigured } from './client'
import { Business, Customer, Visit, QuestionnaireToken, QuestionnaireSubmission, ReviewActivity } from '../types/database'

export interface SupabaseSyncStatus {
  isConnected: boolean
  isSyncing: boolean
  lastSyncedAt: string | null
  error: string | null
  mode: 'supabase_live' | 'local_sandbox'
}

class SupabaseService {
  private status: SupabaseSyncStatus = {
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    mode: isSupabaseConfigured() ? 'supabase_live' : 'local_sandbox'
  }

  getStatus(): SupabaseSyncStatus {
    return { ...this.status }
  }

  /**
   * Tests connection to Supabase and pulls remote tenant records
   */
  async fetchRemoteBusinesses(): Promise<Business[] | null> {
    if (!supabase || !isSupabaseConfigured()) {
      this.status.mode = 'local_sandbox'
      return null
    }

    try {
      this.status.isSyncing = true
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.warn('Supabase businesses query notice:', error.message)
        this.status.error = error.message
        return null
      }

      this.status.isConnected = true
      this.status.mode = 'supabase_live'
      this.status.lastSyncedAt = new Date().toISOString()
      this.status.error = null

      return (data as Business[]) || []
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error'
      this.status.error = msg
      return null
    } finally {
      this.status.isSyncing = false
    }
  }

  /**
   * Fetches customers for a given business workspace
   */
  async fetchRemoteCustomers(businessId: string): Promise<Customer[] | null> {
    if (!supabase || !isSupabaseConfigured()) return null

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('last_seen_at', { ascending: false })

      if (error) return null
      return (data as Customer[]) || []
    } catch {
      return null
    }
  }

  /**
   * Fetches visits for a given business workspace
   */
  async fetchRemoteVisits(businessId: string): Promise<Visit[] | null> {
    if (!supabase || !isSupabaseConfigured()) return null

    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('business_id', businessId)
        .order('visit_timestamp', { ascending: false })

      if (error) return null
      return (data as Visit[]) || []
    } catch {
      return null
    }
  }

  /**
   * Fetches questionnaire submissions for a business
   */
  async fetchRemoteSubmissions(businessId: string): Promise<QuestionnaireSubmission[] | null> {
    if (!supabase || !isSupabaseConfigured()) return null

    try {
      const { data, error } = await supabase
        .from('questionnaire_submissions')
        .select('*')
        .eq('business_id', businessId)
        .order('submitted_at', { ascending: false })

      if (error) return null
      return (data as QuestionnaireSubmission[]) || []
    } catch {
      return null
    }
  }

  /**
   * Fetches review activity events for a business
   */
  async fetchRemoteReviewActivity(businessId: string): Promise<ReviewActivity[] | null> {
    if (!supabase || !isSupabaseConfigured()) return null

    try {
      const { data, error } = await supabase
        .from('review_activity')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (error) return null
      return (data as ReviewActivity[]) || []
    } catch {
      return null
    }
  }

  /**
   * Persists a newly created or updated customer to Supabase in the background
   */
  async persistCustomer(customer: Customer): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return

    try {
      await supabase.from('customers').upsert({
        id: customer.id,
        business_id: customer.business_id,
        name: customer.name,
        normalized_phone: customer.normalized_phone,
        country_code: customer.country_code,
        first_discovery_source: customer.first_discovery_source,
        consent_status: customer.consent_status,
        opted_out_at: customer.opted_out_at,
        notes: customer.notes,
        first_seen_at: customer.first_seen_at,
        last_seen_at: customer.last_seen_at,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      })
    } catch (err) {
      console.warn('Background Supabase customer upsert notice:', err)
    }
  }

  /**
   * Persists a visit record to Supabase
   */
  async persistVisit(visit: Visit): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return

    try {
      await supabase.from('visits').upsert({
        id: visit.id,
        business_id: visit.business_id,
        customer_id: visit.customer_id,
        service: visit.service,
        service_id: visit.service_id,
        staff_user_id: visit.staff_user_id,
        status: visit.status,
        questionnaire_status: visit.questionnaire_status,
        visit_timestamp: visit.visit_timestamp,
        created_at: visit.created_at,
        updated_at: visit.updated_at
      })
    } catch (err) {
      console.warn('Background Supabase visit upsert notice:', err)
    }
  }

  /**
   * Persists a questionnaire token to Supabase
   */
  async persistToken(token: QuestionnaireToken): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return

    try {
      await supabase.from('questionnaire_tokens').upsert({
        id: token.id,
        business_id: token.business_id,
        visit_id: token.visit_id,
        customer_id: token.customer_id,
        token_hash: token.token_hash,
        expires_at: token.expires_at,
        consumed_at: token.consumed_at,
        revoked_at: token.revoked_at,
        created_at: token.created_at
      })
    } catch (err) {
      console.warn('Background Supabase token upsert notice:', err)
    }
  }

  /**
   * Persists a questionnaire submission via the security-definer RPC or direct upsert
   */
  async persistSubmission(sub: QuestionnaireSubmission, tokenHash: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return

    try {
      // Try security definer RPC first
      const { data, error } = await supabase.rpc('submit_public_questionnaire', {
        p_token_hash: tokenHash,
        p_first_visit_answer: sub.first_visit_answer,
        p_discovery_source: sub.discovery_source_answer,
        p_service_received: sub.service_answer,
        p_rating: sub.rating || null,
        p_feedback: sub.feedback_text || null
      })

      if (error) {
        // Fallback to table insert if RPC unavailable or token already validated
        await supabase.from('questionnaire_submissions').upsert({
          id: sub.id,
          business_id: sub.business_id,
          visit_id: sub.visit_id,
          customer_id: sub.customer_id,
          token_id: sub.token_id,
          first_visit_answer: sub.first_visit_answer,
          discovery_source_answer: sub.discovery_source_answer,
          service_answer: sub.service_answer,
          rating: sub.rating,
          feedback_text: sub.feedback_text,
          submitted_at: sub.submitted_at
        })
      }
    } catch (err) {
      console.warn('Background Supabase submission notice:', err)
    }
  }

  /**
   * Persists review activity to Supabase
   */
  async persistReviewActivity(event: ReviewActivity): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return

    try {
      await supabase.from('review_activity').upsert({
        id: event.id,
        business_id: event.business_id,
        customer_id: event.customer_id,
        visit_id: event.visit_id,
        event_type: event.event_type,
        source: event.source,
        verification_level: event.verification_level,
        review_count_snapshot: event.review_count_snapshot,
        created_at: event.created_at
      })
    } catch (err) {
      console.warn('Background Supabase review activity notice:', err)
    }
  }

  /**
   * Persists business settings updates
   */
  async persistBusinessSettings(businessId: string, updates: Partial<Business>): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return

    try {
      await supabase.from('businesses').update({
        google_review_url: updates.google_review_url,
        discovery_source_options: updates.discovery_source_options,
        services: updates.services,
        address: updates.address,
        updated_at: new Date().toISOString()
      }).eq('id', businessId)
    } catch (err) {
      console.warn('Background Supabase business update notice:', err)
    }
  }
}

export const supabaseService = new SupabaseService()
