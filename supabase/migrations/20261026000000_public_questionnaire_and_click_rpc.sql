-- ====================================================================
-- CLIENTLOOP PUBLIC QUESTIONNAIRE CONTEXT & REVIEW TRACKING RPC
-- Migration: 20261026000000_public_questionnaire_and_click_rpc.sql
-- Enables zero-PII public questionnaire resolution for mobile clients
-- ====================================================================

-- 1. RPC: Fetch public questionnaire context by single-use token hash
CREATE OR REPLACE FUNCTION get_public_questionnaire_context(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token RECORD;
    v_business RECORD;
    v_customer RECORD;
    v_visit RECORD;
    v_first_name TEXT := '';
BEGIN
    -- Look up token
    SELECT * INTO v_token
    FROM questionnaire_tokens
    WHERE token_hash = p_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'INVALID_TOKEN');
    END IF;

    IF v_token.revoked_at IS NOT NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'TOKEN_REVOKED');
    END IF;

    IF v_token.consumed_at IS NOT NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'ALREADY_SUBMITTED');
    END IF;

    IF v_token.expires_at < now() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'TOKEN_EXPIRED');
    END IF;

    -- Look up business
    SELECT * INTO v_business
    FROM businesses
    WHERE id = v_token.business_id;

    -- Look up customer (for friendly greeting only, no phone or PII)
    SELECT * INTO v_customer
    FROM customers
    WHERE id = v_token.customer_id;

    IF v_customer.name IS NOT NULL AND length(trim(v_customer.name)) > 0 THEN
        v_first_name := split_part(trim(v_customer.name), ' ', 1);
    END IF;

    -- Look up visit
    SELECT * INTO v_visit
    FROM visits
    WHERE id = v_token.visit_id;

    RETURN jsonb_build_object(
        'valid', true,
        'token_id', v_token.id,
        'business_id', v_business.id,
        'business_name', v_business.name,
        'business_category', v_business.category,
        'business_timezone', v_business.timezone,
        'google_review_url', v_business.google_review_url,
        'services', v_business.services,
        'discovery_source_options', v_business.discovery_source_options,
        'customer_first_name', v_first_name,
        'visit_service', COALESCE(v_visit.service, 'Service Visit'),
        'expires_at', v_token.expires_at
    );
END;
$$;

-- 2. RPC: Record public outbound review click
CREATE OR REPLACE FUNCTION record_public_review_click(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token RECORD;
BEGIN
    SELECT * INTO v_token
    FROM questionnaire_tokens
    WHERE token_hash = p_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN');
    END IF;

    INSERT INTO review_activity (
        business_id,
        customer_id,
        visit_id,
        event_type,
        source,
        verification_level,
        review_count_snapshot,
        created_at
    ) VALUES (
        v_token.business_id,
        v_token.customer_id,
        v_token.visit_id,
        'link_clicked',
        'thank_you_page',
        'unverified_click',
        NULL,
        now()
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Grant execute permissions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_public_questionnaire_context(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_public_review_click(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION submit_public_questionnaire(TEXT, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated, service_role;
