-- ====================================================================
-- CLIENTLOOP MULTI-TENANT DATABASE SCHEMA & ROW-LEVEL SECURITY
-- Migration: 20261022000000_clientloop_schema.sql
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('owner', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'invited');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE consent_status AS ENUM ('implicit_transaction', 'explicit_oral', 'explicit_written', 'opted_out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE visit_status AS ENUM ('in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed', 'suppressed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_event_type AS ENUM ('invitation_shown', 'link_clicked', 'synced_review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_verification_level AS ENUM ('unverified_click', 'google_api_synced', 'manual_check');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- 3. CORE TABLES
-- ====================================================================

-- Table: businesses (Tenants)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'service',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    address TEXT,
    google_review_url TEXT,
    branding JSONB DEFAULT '{"primary_color": "#2563EB", "logo_url": null}'::jsonb NOT NULL,
    services JSONB DEFAULT '[
        {"id": "srv_1", "name": "General Service", "default_duration_min": 45}
    ]'::jsonb NOT NULL,
    discovery_source_options JSONB DEFAULT '[
        "Friend or Family", "Google Maps / Search", "Social Media", "Walk-In / Signage", "Other"
    ]'::jsonb NOT NULL,
    messaging_config JSONB DEFAULT '{
        "provider": "whatsapp_cloud_api",
        "cooldown_hours": 72,
        "auto_send_on_visit": true,
        "whatsapp_phone_number_id": null
    }'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: business_memberships (User Workspace Access & Roles)
CREATE TABLE IF NOT EXISTS business_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'staff',
    status membership_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_membership_user_business UNIQUE(user_id, business_id)
);

-- Table: customers (Customer Directory - Strictly Scoped to Tenant)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT,
    normalized_phone TEXT NOT NULL,
    country_code TEXT DEFAULT '+1' NOT NULL,
    first_discovery_source TEXT,
    consent_status consent_status NOT NULL DEFAULT 'implicit_transaction',
    opted_out_at TIMESTAMPTZ,
    notes TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- CRITICAL MULTI-TENANT ISOLATION CONSTRAINT:
    -- Identity is unique only within this specific business!
    CONSTRAINT uq_customer_business_phone UNIQUE(business_id, normalized_phone)
);

-- Table: visits (Recorded Customer Interactions)
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    service_id TEXT,
    staff_user_id UUID,
    status visit_status NOT NULL DEFAULT 'completed',
    questionnaire_status TEXT NOT NULL DEFAULT 'none',
    visit_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: questionnaire_definitions (Branded / Customized Form Templates)
CREATE TABLE IF NOT EXISTS questionnaire_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Customer Visit Feedback',
    fields JSONB NOT NULL DEFAULT '[
        {"key": "first_visit", "label": "Was this your first visit?", "type": "boolean", "required": true},
        {"key": "discovery_source", "label": "How did you hear about us?", "type": "select", "required": true},
        {"key": "service_received", "label": "Service received", "type": "select", "required": true},
        {"key": "feedback", "label": "Any comments for our team?", "type": "text", "required": false}
    ]'::jsonb,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: questionnaire_tokens (Secure, Expiring Single-Use Link Hashes)
CREATE TABLE IF NOT EXISTS questionnaire_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: questionnaire_submissions (Customer Responses)
CREATE TABLE IF NOT EXISTS questionnaire_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    token_id UUID NOT NULL REFERENCES questionnaire_tokens(id) ON DELETE CASCADE,
    -- Store customer answer separately from system calculated visit history!
    first_visit_answer BOOLEAN NOT NULL,
    discovery_source_answer TEXT NOT NULL,
    service_answer TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    ip_hash TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Ensure exactly one submission per visit (Idempotency)
    CONSTRAINT uq_submission_visit UNIQUE(visit_id)
);

-- Table: messages (WhatsApp Follow-Up Dispatch Queue & Events)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    provider_message_id TEXT,
    template_name TEXT NOT NULL,
    status message_status NOT NULL DEFAULT 'queued',
    failure_reason TEXT,
    idempotency_key TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_message_idempotency UNIQUE(business_id, idempotency_key)
);

-- Table: review_activity (Honest Review Invitation & Outbound Click Tracking)
CREATE TABLE IF NOT EXISTS review_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    event_type review_event_type NOT NULL,
    source TEXT DEFAULT 'thank_you_page' NOT NULL,
    verification_level review_verification_level NOT NULL DEFAULT 'unverified_click',
    review_count_snapshot INTEGER,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: audit_events (Security & Data Access Log)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    actor_user_id UUID,
    action TEXT NOT NULL,
    record_type TEXT NOT NULL,
    record_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================================
-- 4. PERFORMANCE INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, normalized_phone);
CREATE INDEX IF NOT EXISTS idx_customers_last_seen ON customers(business_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_timestamp ON visits(business_id, visit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON questionnaire_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_visit ON questionnaire_tokens(visit_id);
CREATE INDEX IF NOT EXISTS idx_submissions_business ON questionnaire_submissions(business_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(business_id, status);
CREATE INDEX IF NOT EXISTS idx_review_events_type ON review_activity(business_id, event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(business_id, created_at DESC);

-- ====================================================================
-- 5. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ====================================================================

-- Helper 1: Returns all business IDs that the current authenticated user belongs to
CREATE OR REPLACE FUNCTION get_auth_business_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT business_id 
    FROM business_memberships 
    WHERE user_id = auth.uid() 
      AND status = 'active';
$$;

-- Helper 2: Verifies if current user has a specific minimum role in a business
CREATE OR REPLACE FUNCTION has_business_role(p_business_id UUID, p_roles workspace_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM business_memberships 
        WHERE user_id = auth.uid() 
          AND business_id = p_business_id 
          AND status = 'active'
          AND role = ANY(p_roles)
    );
$$;

-- ====================================================================
-- 6. ENABLE ROW LEVEL SECURITY ON ALL TENANT-OWNED TABLES
-- ====================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 7. RLS POLICIES FOR DATA ISOLATION
-- ====================================================================

-- Policy: businesses
CREATE POLICY "Members can view their business profile"
    ON businesses FOR SELECT
    USING (id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Owners can update their business profile"
    ON businesses FOR UPDATE
    USING (has_business_role(id, ARRAY['owner'::workspace_role]));

-- Policy: business_memberships
CREATE POLICY "Members can view coworkers in their business"
    ON business_memberships FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Owners and managers can manage memberships"
    ON business_memberships FOR ALL
    USING (has_business_role(business_id, ARRAY['owner'::workspace_role, 'manager'::workspace_role]));

-- Policy: customers
CREATE POLICY "Staff can view customers of their business"
    ON customers FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Staff can create customers in their business"
    ON customers FOR INSERT
    WITH CHECK (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Staff can update customer notes and consent in their business"
    ON customers FOR UPDATE
    USING (business_id IN (SELECT get_auth_business_ids()));

-- Policy: visits
CREATE POLICY "Staff can view visits in their business"
    ON visits FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Staff can record visits in their business"
    ON visits FOR INSERT
    WITH CHECK (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Staff can update visits in their business"
    ON visits FOR UPDATE
    USING (business_id IN (SELECT get_auth_business_ids()));

-- Policy: questionnaire_definitions
CREATE POLICY "Staff can view questionnaire templates"
    ON questionnaire_definitions FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Managers can configure questionnaire templates"
    ON questionnaire_definitions FOR ALL
    USING (has_business_role(business_id, ARRAY['owner'::workspace_role, 'manager'::workspace_role]));

-- Policy: questionnaire_tokens
CREATE POLICY "Staff can view questionnaire tokens"
    ON questionnaire_tokens FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "System and staff can insert questionnaire tokens"
    ON questionnaire_tokens FOR INSERT
    WITH CHECK (business_id IN (SELECT get_auth_business_ids()));

-- Policy: questionnaire_submissions
CREATE POLICY "Staff can view submissions in their business"
    ON questionnaire_submissions FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

-- Policy: messages
CREATE POLICY "Staff can view message queue in their business"
    ON messages FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "Staff can queue messages in their business"
    ON messages FOR INSERT
    WITH CHECK (business_id IN (SELECT get_auth_business_ids()));

-- Policy: review_activity
CREATE POLICY "Staff can view review activities in their business"
    ON review_activity FOR SELECT
    USING (business_id IN (SELECT get_auth_business_ids()));

CREATE POLICY "System can record review activities"
    ON review_activity FOR INSERT
    WITH CHECK (business_id IN (SELECT get_auth_business_ids()));

-- Policy: audit_events
CREATE POLICY "Owners and managers can view audit events"
    ON audit_events FOR SELECT
    USING (has_business_role(business_id, ARRAY['owner'::workspace_role, 'manager'::workspace_role]));

CREATE POLICY "Authorized system actions record audit events"
    ON audit_events FOR INSERT
    WITH CHECK (business_id IN (SELECT get_auth_business_ids()));

-- ====================================================================
-- 8. PUBLIC SECURITY-DEFINER FUNCTION FOR SECURE QUESTIONNAIRE ACCESS
-- ====================================================================

-- Function: validate_and_submit_questionnaire
-- Allows public mobile browser with valid token hash to submit without logging in
CREATE OR REPLACE FUNCTION submit_public_questionnaire(
    p_token_hash TEXT,
    p_first_visit_answer BOOLEAN,
    p_discovery_source TEXT,
    p_service_received TEXT,
    p_rating INTEGER DEFAULT NULL,
    p_feedback TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token RECORD;
    v_submission_id UUID;
BEGIN
    -- 1. Find and validate token
    SELECT * INTO v_token
    FROM questionnaire_tokens
    WHERE token_hash = p_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN');
    END IF;

    IF v_token.revoked_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'TOKEN_REVOKED');
    END IF;

    IF v_token.consumed_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_SUBMITTED');
    END IF;

    IF v_token.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'TOKEN_EXPIRED');
    END IF;

    -- 2. Insert submission idempotently
    INSERT INTO questionnaire_submissions (
        business_id,
        visit_id,
        customer_id,
        token_id,
        first_visit_answer,
        discovery_source_answer,
        service_answer,
        rating,
        feedback_text,
        ip_hash,
        submitted_at
    ) VALUES (
        v_token.business_id,
        v_token.visit_id,
        v_token.customer_id,
        v_token.id,
        p_first_visit_answer,
        p_discovery_source,
        p_service_received,
        p_rating,
        p_feedback,
        p_ip_hash,
        now()
    )
    RETURNING id INTO v_submission_id;

    -- 3. Mark token as consumed
    UPDATE questionnaire_tokens
    SET consumed_at = now()
    WHERE id = v_token.id;

    -- 4. Update visit questionnaire status
    UPDATE visits
    SET questionnaire_status = 'submitted',
        updated_at = now()
    WHERE id = v_token.visit_id;

    -- 5. Update customer last seen timestamp and discovery source if not set
    UPDATE customers
    SET last_seen_at = now(),
        first_discovery_source = COALESCE(first_discovery_source, p_discovery_source),
        updated_at = now()
    WHERE id = v_token.customer_id;

    RETURN jsonb_build_object(
        'success', true, 
        'submission_id', v_submission_id,
        'business_id', v_token.business_id
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_SUBMISSION');
END;
$$;
