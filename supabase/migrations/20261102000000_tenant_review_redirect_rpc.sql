-- ====================================================================
-- CLIENTLOOP TENANT REVIEW REDIRECT & TELEMETRY RPC
-- Migration: 20261102000000_tenant_review_redirect_rpc.sql
-- Enables unauthenticated public review redirection and click tracking
-- For Google Form confirmation links (e.g. /r/:businessSlug)
-- ====================================================================

-- 1. RPC: Fetch public business review destination safely (zero PII)
CREATE OR REPLACE FUNCTION get_public_business_review_info(p_business_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business RECORD;
BEGIN
    IF p_business_identifier IS NULL OR length(trim(p_business_identifier)) = 0 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'IDENTIFIER_REQUIRED');
    END IF;

    -- Look up by UUID if matches UUID format, otherwise by slug
    IF p_business_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT * INTO v_business FROM businesses WHERE id = p_business_identifier::UUID;
    ELSE
        SELECT * INTO v_business FROM businesses WHERE slug = p_business_identifier;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'BUSINESS_NOT_FOUND');
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'business_id', v_business.id,
        'business_name', v_business.name,
        'business_slug', v_business.slug,
        'business_address', v_business.address,
        'google_review_url', v_business.google_review_url
    );
END;
$$;

-- 2. RPC: Record tenant-scoped review click from external link (e.g. Google Form confirmation)
CREATE OR REPLACE FUNCTION record_public_business_review_click(
    p_business_identifier TEXT,
    p_customer_id UUID DEFAULT NULL,
    p_visit_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'google_form'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business RECORD;
    v_business_id UUID;
    v_event_id UUID := gen_random_uuid();
BEGIN
    IF p_business_identifier IS NULL OR length(trim(p_business_identifier)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'IDENTIFIER_REQUIRED');
    END IF;

    IF p_business_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT * INTO v_business FROM businesses WHERE id = p_business_identifier::UUID;
    ELSE
        SELECT * INTO v_business FROM businesses WHERE slug = p_business_identifier;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'BUSINESS_NOT_FOUND');
    END IF;

    v_business_id := v_business.id;

    INSERT INTO review_activity (
        id,
        business_id,
        customer_id,
        visit_id,
        event_type,
        source,
        verification_level,
        review_count_snapshot,
        created_at
    ) VALUES (
        v_event_id,
        v_business_id,
        p_customer_id,
        p_visit_id,
        'link_clicked',
        COALESCE(NULLIF(trim(p_source), ''), 'google_form'),
        'unverified_click',
        NULL,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_event_id,
        'business_id', v_business_id,
        'business_name', v_business.name,
        'google_review_url', v_business.google_review_url
    );
END;
$$;

-- 3. Grant execute permissions to anonymous, authenticated, and service_role
GRANT EXECUTE ON FUNCTION get_public_business_review_info(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_public_business_review_click(TEXT, UUID, UUID, TEXT) TO anon, authenticated, service_role;
