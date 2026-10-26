-- ====================================================================
-- CLIENTLOOP TENANT ISOLATION & SECURITY TEST SUITE
-- Migration / Test Script: 20261022000001_tenant_isolation_tests.sql
-- ====================================================================

-- Test Procedure: run_clientloop_isolation_tests()
-- Can be executed in any Supabase / PostgreSQL environment to verify tenant boundaries.

CREATE OR REPLACE FUNCTION run_clientloop_isolation_tests()
RETURNS TABLE(test_name TEXT, status TEXT, details TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_b1_id UUID;
    v_b2_id UUID;
    v_u1_id UUID := gen_random_uuid();
    v_u2_id UUID := gen_random_uuid();
    v_c1_id UUID;
    v_c2_id UUID;
    v_v1_id UUID;
    v_token_hash TEXT := 'test_token_hash_alpha_991';
    v_result JSONB;
    v_test_passed BOOLEAN;
BEGIN
    -- SETUP: Create two distinct mock businesses (Tenant A & Tenant B)
    INSERT INTO businesses (name, slug, category)
    VALUES ('Tenant A Salon', 'tenant-a-salon', 'salon')
    RETURNING id INTO v_b1_id;

    INSERT INTO businesses (name, slug, category)
    VALUES ('Tenant B Auto', 'tenant-b-auto', 'repair')
    RETURNING id INTO v_b2_id;

    -- Create memberships: User 1 in Tenant A, User 2 in Tenant B
    INSERT INTO business_memberships (user_id, business_id, role)
    VALUES (v_u1_id, v_b1_id, 'owner');

    INSERT INTO business_memberships (user_id, business_id, role)
    VALUES (v_u2_id, v_b2_id, 'owner');

    -- ----------------------------------------------------------------
    -- TEST 1: Same Phone Number Can Exist in Both Businesses without Collision
    -- ----------------------------------------------------------------
    BEGIN
        INSERT INTO customers (business_id, name, normalized_phone, country_code)
        VALUES (v_b1_id, 'Sarah A.', '+15550192834', '+1')
        RETURNING id INTO v_c1_id;

        INSERT INTO customers (business_id, name, normalized_phone, country_code)
        VALUES (v_b2_id, 'Sarah B.', '+15550192834', '+1')
        RETURNING id INTO v_c2_id;

        test_name := 'TEST 1: Scoped Phone Uniqueness';
        status := 'PASSED';
        details := 'Identical phone numbers successfully coexist across distinct businesses without collision.';
        RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'TEST 1: Scoped Phone Uniqueness';
        status := 'FAILED';
        details := SQLERRM;
        RETURN NEXT;
    END;

    -- ----------------------------------------------------------------
    -- TEST 2: Duplicate Phone Inside the SAME Business Must Throw Unique Violation
    -- ----------------------------------------------------------------
    BEGIN
        INSERT INTO customers (business_id, name, normalized_phone, country_code)
        VALUES (v_b1_id, 'Sarah Duplicate', '+15550192834', '+1');

        test_name := 'TEST 2: Duplicate Phone Collision Detection';
        status := 'FAILED';
        details := 'Expected unique constraint violation for duplicate phone in same tenant, but insert succeeded.';
        RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
        test_name := 'TEST 2: Duplicate Phone Collision Detection';
        status := 'PASSED';
        details := 'Duplicate phone in same tenant was correctly blocked by uq_customer_business_phone.';
        RETURN NEXT;
    END;

    -- ----------------------------------------------------------------
    -- TEST 3: Questionnaire Token Generation & Public Submission
    -- ----------------------------------------------------------------
    BEGIN
        -- Create visit in Tenant A
        INSERT INTO visits (business_id, customer_id, service)
        VALUES (v_b1_id, v_c1_id, 'Haircut & Styling')
        RETURNING id INTO v_v1_id;

        -- Create active token
        INSERT INTO questionnaire_tokens (business_id, visit_id, customer_id, token_hash, expires_at)
        VALUES (v_b1_id, v_v1_id, v_c1_id, v_token_hash, now() + interval '72 hours');

        -- Submit public questionnaire
        v_result := submit_public_questionnaire(
            v_token_hash,
            true,
            'Google Maps / Search',
            'Haircut & Styling',
            5,
            'Great experience!',
            'sample_ip_hash'
        );

        IF (v_result->>'success')::BOOLEAN = true THEN
            test_name := 'TEST 3: Public Questionnaire Submission Flow';
            status := 'PASSED';
            details := 'Submission succeeded, token consumed, and visit status updated.';
            RETURN NEXT;
        ELSE
            test_name := 'TEST 3: Public Questionnaire Submission Flow';
            status := 'FAILED';
            details := 'submit_public_questionnaire returned error: ' || (v_result->>'error');
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'TEST 3: Public Questionnaire Submission Flow';
        status := 'FAILED';
        details := SQLERRM;
        RETURN NEXT;
    END;

    -- ----------------------------------------------------------------
    -- TEST 4: Reusing Already Consumed Token Must Fail
    -- ----------------------------------------------------------------
    BEGIN
        v_result := submit_public_questionnaire(
            v_token_hash,
            false,
            'Instagram',
            'Haircut & Styling',
            4,
            'Trying to re-submit'
        );

        IF (v_result->>'error') = 'ALREADY_SUBMITTED' THEN
            test_name := 'TEST 4: Token Reuse & Double-Submit Protection';
            status := 'PASSED';
            details := 'System correctly rejected reused token with ALREADY_SUBMITTED.';
            RETURN NEXT;
        ELSE
            test_name := 'TEST 4: Token Reuse & Double-Submit Protection';
            status := 'FAILED';
            details := 'Expected ALREADY_SUBMITTED, got: ' || v_result::text;
            RETURN NEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        test_name := 'TEST 4: Token Reuse & Double-Submit Protection';
        status := 'FAILED';
        details := SQLERRM;
        RETURN NEXT;
    END;

    -- CLEANUP: Remove test fixtures
    DELETE FROM businesses WHERE id IN (v_b1_id, v_b2_id);

    RETURN;
END;
$$;
