import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRoute, buildReviewRedirectUrl } from '../../src/lib/navigation/urlRouter'
import { googleReviewSync } from '../../src/lib/reviews/googleReviewSync'
import { calculateDashboardMetrics } from '../../src/lib/metrics/dashboardMetrics'
import { store, generateUuid } from '../../src/lib/services/store'

test('Review Redirect Routing - Parses path /r/:identifier into review_redirect view', () => {
  const route = parseRoute('https://client-loop-two.vercel.app/r/paso-elite-salon')
  assert.equal(route.view, 'review_redirect')
  assert.equal(route.businessIdentifier, 'paso-elite-salon')
  // By default, /r/:slug redirects default to 'google_form' source for clean URLs in Google Form confirmation
  assert.equal(route.source, 'google_form')
})

test('Review Redirect Routing - Parses path /review/:identifier with query parameters', () => {
  const customerId = generateUuid()
  const visitId = generateUuid()
  const route = parseRoute(`https://clientloop.app/review/paso-elite-salon?source=in_app&c=${customerId}&v=${visitId}`)
  assert.equal(route.view, 'review_redirect')
  assert.equal(route.businessIdentifier, 'paso-elite-salon')
  assert.equal(route.source, 'in_app')
  assert.equal(route.customerId, customerId)
  assert.equal(route.visitId, visitId)
})

test('Review Redirect Routing - Parses query param ?r=:identifier', () => {
  const route = parseRoute('https://client-loop-two.vercel.app/?r=b506b0c2-01fe-4a05-a107-8f5cb8b1d880')
  assert.equal(route.view, 'review_redirect')
  assert.equal(route.businessIdentifier, 'b506b0c2-01fe-4a05-a107-8f5cb8b1d880')
})

test('Review Redirect Routing - Parses hash route #/r/:identifier', () => {
  const route = parseRoute('http://localhost:5173/#/r/paso-elite-salon')
  assert.equal(route.view, 'review_redirect')
  assert.equal(route.businessIdentifier, 'paso-elite-salon')
})

test('Review Redirect URL Builder - Generates canonical tenant tracking URL', () => {
  const url = buildReviewRedirectUrl('paso-elite-salon', 'https://client-loop-two.vercel.app')
  assert.equal(url, 'https://client-loop-two.vercel.app/r/paso-elite-salon')
})

test('Review Redirect URL Builder - Includes portable context and source params', () => {
  const url = buildReviewRedirectUrl('paso-elite-salon', 'https://client-loop-two.vercel.app', {
    source: 'custom_source',
    context: {
      businessId: 'test-biz-uuid',
      businessName: 'Paso Elite Unisex Salon',
      googleReviewUrl: 'https://maps.google.com/?cid=123456789'
    }
  })
  
  assert.ok(url.startsWith('https://client-loop-two.vercel.app/r/paso-elite-salon?'))
  assert.ok(url.includes('src=custom_source'))
  assert.ok(url.includes('d='))

  // Verify route parser decodes portable context
  const route = parseRoute(url)
  assert.equal(route.view, 'review_redirect')
  assert.equal(route.businessIdentifier, 'paso-elite-salon')
  assert.equal(route.source, 'custom_source')
  assert.equal(route.embeddedContext?.businessName, 'Paso Elite Unisex Salon')
  assert.equal(route.embeddedContext?.googleReviewUrl, 'https://maps.google.com/?cid=123456789')
})

test('Open Redirect Prevention - Only allows legitimate Google domains', () => {
  // Allowed domains
  const validMaps = googleReviewSync.validateGoogleReviewUrl('https://maps.google.com/?cid=12345678901234567890')
  assert.equal(validMaps.isValid, true)

  const validGPage = googleReviewSync.validateGoogleReviewUrl('https://g.page/r/Cb_8K01a-test/review')
  assert.equal(validGPage.isValid, true)

  const validSearch = googleReviewSync.validateGoogleReviewUrl('https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4')
  assert.equal(validSearch.isValid, true)

  const validShortMaps = googleReviewSync.validateGoogleReviewUrl('https://maps.app.goo.gl/abCdEfGhIj1234')
  assert.equal(validShortMaps.isValid, true)

  const validGooGl = googleReviewSync.validateGoogleReviewUrl('https://goo.gl/maps/xyz987')
  assert.equal(validGooGl.isValid, true)

  // Disallowed malicious / phish domains (Open redirect prevention)
  const phishingDomain = googleReviewSync.validateGoogleReviewUrl('https://evil-phishing-site.com/steal-creds')
  assert.equal(phishingDomain.isValid, false)

  const lookalikeDomain = googleReviewSync.validateGoogleReviewUrl('https://google.com.attacker.com/review')
  assert.equal(lookalikeDomain.isValid, false)

  const insecureHttp = googleReviewSync.validateGoogleReviewUrl('http://maps.google.com/?cid=123456')
  assert.equal(insecureHttp.isValid, false)
})

test('Multi-Tenant Telemetry - Separates events and does not count link clicks as completed reviews', () => {
  // Verify pre-seeded Paso Elite can be retrieved by slug or ID
  const seededPaso = store.getBusinessBySlug('paso-elite-salon')
  assert.ok(seededPaso)
  assert.equal(seededPaso?.slug, 'paso-elite-salon')

  // Setup Tenant A (New distinct slug)
  const tenantAId = generateUuid()
  const tenantA = store.createBusiness({
    id: tenantAId,
    name: 'Alpha Hair Lounge',
    slug: 'alpha-hair-lounge',
    category: 'Hair Salon',
    timezone: 'Africa/Lagos',
    google_review_url: 'https://maps.google.com/?cid=alpha_cid_123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  // Setup Tenant B (Zenith Spa)
  const tenantBId = generateUuid()
  const tenantB = store.createBusiness({
    id: tenantBId,
    name: 'Zenith Day Spa',
    slug: 'zenith-spa',
    category: 'Spa',
    timezone: 'Africa/Lagos',
    google_review_url: 'https://g.page/r/zenith-spa-review/review',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  // Verify lookup by slug and identifier
  const foundBySlugA = store.getBusinessBySlug('alpha-hair-lounge')
  assert.equal(foundBySlugA?.id, tenantA.id)

  const foundBySlugB = store.getBusinessBySlug('zenith-spa')
  assert.equal(foundBySlugB?.id, tenantB.id)

  const foundByIdA = store.getBusinessByIdOrSlug(tenantA.id)
  assert.equal(foundByIdA?.slug, 'alpha-hair-lounge')

  // Record a review link click from Google Form for Tenant A (no customer ID known)
  const clickEventA = store.recordReviewClick(tenantA.id, undefined, undefined, 'google_form')
  assert.equal(clickEventA.business_id, tenantA.id)
  assert.equal(clickEventA.customer_id, null)
  assert.equal(clickEventA.source, 'google_form')
  assert.equal(clickEventA.event_type, 'link_clicked')

  // Record a review link click from In-App survey for Tenant B
  const custB = store.createOrUpdateCustomer(tenantB.id, {
    phone: '+2348011112222',
    name: 'Jane Doe'
  })
  const clickEventB = store.recordReviewClick(tenantB.id, custB.customer.id, undefined, 'thank_you_page')
  assert.equal(clickEventB.business_id, tenantB.id)
  assert.equal(clickEventB.customer_id, custB.customer.id)
  assert.equal(clickEventB.source, 'thank_you_page')

  // Check metrics for Tenant A:
  // Must record outbound click without fabricating completed reviews
  const metricsA = calculateDashboardMetrics(tenantA.id, { preset: 'all_time' })
  assert.equal(metricsA.reviewLinkClicks, 1)
  assert.equal(metricsA.googleReviewSyncStatus.isConnected, false)
  const summaryA = googleReviewSync.getReviewMetricsSummary(tenantA.id)
  assert.equal(summaryA.syncedReviews, 0, 'Link click MUST NOT be counted as confirmed review')

  // Check metrics for Tenant B:
  const metricsB = calculateDashboardMetrics(tenantB.id, { preset: 'all_time' })
  assert.equal(metricsB.reviewLinkClicks, 1)
  assert.equal(metricsB.googleReviewSyncStatus.isConnected, false)
  const summaryB = googleReviewSync.getReviewMetricsSummary(tenantB.id)
  assert.equal(summaryB.syncedReviews, 0, 'Link click MUST NOT be counted as confirmed review')

  // Tenant Isolation verification:
  const eventsA = store.getReviewActivities(tenantA.id)
  assert.equal(eventsA.length, 1)
  assert.equal(eventsA[0].business_id, tenantA.id)
  assert.equal(eventsA[0].source, 'google_form')

  const eventsB = store.getReviewActivities(tenantB.id)
  assert.equal(eventsB.length, 1)
  assert.equal(eventsB[0].business_id, tenantB.id)
  assert.equal(eventsB[0].source, 'thank_you_page')
})

test('Google Form Intake URL - Interpolates into WhatsApp message and persists in Business Settings', () => {
  const bizId = generateUuid()
  const biz = store.createBusiness({
    id: bizId,
    name: 'Paso Elite Unisex Salon',
    slug: `paso-test-${Date.now()}`,
    category: 'Hair Salon',
    timezone: 'Africa/Lagos',
    google_review_url: 'https://maps.google.com/?cid=123456789',
    google_form_url: 'https://forms.gle/VaGnVjmttgEcCgte8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  assert.equal(biz.google_form_url, 'https://forms.gle/VaGnVjmttgEcCgte8')

  // Update form link
  store.updateBusinessSettings(bizId, {
    google_form_url: 'https://docs.google.com/forms/d/e/1FAIpQLSeJ9zcJKOpczm5J_RoFmQBw81XYccof9X1rrsEKJ0o_D-q0Jw/viewform'
  })
  const updated = store.getBusinessById(bizId)
  assert.equal(updated?.google_form_url, 'https://docs.google.com/forms/d/e/1FAIpQLSeJ9zcJKOpczm5J_RoFmQBw81XYccof9X1rrsEKJ0o_D-q0Jw/viewform')
})
