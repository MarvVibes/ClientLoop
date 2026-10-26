// ====================================================================
// CLIENTLOOP DATABASE TYPE DEFINITIONS
// Represents the PostgreSQL / Supabase Schema
// ====================================================================

export type WorkspaceRole = 'owner' | 'manager' | 'staff'
export type MembershipStatus = 'active' | 'suspended' | 'invited'
export type ConsentStatus = 'implicit_transaction' | 'explicit_oral' | 'explicit_written' | 'opted_out'
export type VisitStatus = 'in_progress' | 'completed' | 'cancelled'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'suppressed'
export type ReviewEventType = 'invitation_shown' | 'link_clicked' | 'synced_review'
export type ReviewVerificationLevel = 'unverified_click' | 'google_api_synced' | 'manual_check'

export interface Business {
  id: string
  name: string
  slug: string
  category: string
  timezone: string
  address: string | null
  google_review_url: string | null
  branding: {
    primary_color?: string
    logo_url?: string | null
  }
  services: {
    id: string
    name: string
    default_price?: number
    default_duration_min?: number
  }[]
  discovery_source_options: string[]
  messaging_config: {
    provider: string
    cooldown_hours: number
    auto_send_on_visit: boolean
    whatsapp_phone_number_id?: string | null
  }
  created_at: string
  updated_at: string
}

export interface BusinessMembership {
  id: string
  user_id: string
  business_id: string
  role: WorkspaceRole
  status: MembershipStatus
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string | null
  normalized_phone: string
  country_code: string
  first_discovery_source: string | null
  consent_status: ConsentStatus
  opted_out_at: string | null
  notes: string | null
  first_seen_at: string
  last_seen_at: string
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  business_id: string
  customer_id: string
  service: string
  service_id: string | null
  staff_user_id: string | null
  status: VisitStatus
  questionnaire_status: string
  visit_timestamp: string
  created_at: string
  updated_at: string
}

export interface QuestionnaireDefinition {
  id: string
  business_id: string
  title: string
  fields: {
    key: string
    label: string
    type: 'boolean' | 'select' | 'text' | 'rating'
    required: boolean
    options?: string[]
  }[]
  is_active: boolean
  created_at: string
}

export interface QuestionnaireToken {
  id: string
  business_id: string
  visit_id: string
  customer_id: string
  token_hash: string
  expires_at: string
  consumed_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface QuestionnaireSubmission {
  id: string
  business_id: string
  visit_id: string
  customer_id: string
  token_id: string
  first_visit_answer: boolean
  discovery_source_answer: string
  discovery_source_clarification?: string | null
  service_answer: string
  rating: number | null
  feedback_text: string | null
  ip_hash: string | null
  submitted_at: string
}

export interface Message {
  id: string
  business_id: string
  customer_id: string
  visit_id: string | null
  provider_message_id: string | null
  template_name: string
  status: MessageStatus
  failure_reason: string | null
  idempotency_key: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  created_at: string
}

export interface ReviewActivity {
  id: string
  business_id: string
  customer_id: string | null
  visit_id: string | null
  event_type: ReviewEventType
  source: string
  verification_level: ReviewVerificationLevel
  review_count_snapshot: number | null
  created_at: string
}

export interface AuditEvent {
  id: string
  business_id: string
  actor_user_id: string | null
  action: string
  record_type: string
  record_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}
