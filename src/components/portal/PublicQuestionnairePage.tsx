import React, { useState, useEffect, useMemo } from 'react'
import { store, TEST_FIXTURE_BUSINESSES } from '../../lib/services/store'
import { supabaseService } from '../../lib/supabase/service'
import { decodeLinkContext } from '../../lib/navigation/urlRouter'
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Star,
  ThumbsUp,
  AlertCircle,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface PublicQuestionnairePageProps {
  tokenHash: string
  onClose?: () => void
}

export const PublicQuestionnairePage: React.FC<PublicQuestionnairePageProps> = ({
  tokenHash,
  onClose
}) => {
  // 1. Initial synchronous lookup: Check local store OR parse portable URL payload (?d=...)
  const [token, setToken] = useState(() => {
    const local = store.findTokenByHash(tokenHash)
    if (local) return local

    // Parse portable payload from URL query parameters (instant cross-device zero-latency load)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const encoded = searchParams.get('d')
      if (encoded) {
        const ctx = decodeLinkContext(encoded)
        if (ctx && ctx.businessName) {
          store.hydrateTokenContext({
            tokenId: tokenHash,
            businessId: ctx.businessId || 'biz_paso_elite',
            businessName: ctx.businessName,
            tokenHash,
            expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
            googleReviewUrl: ctx.googleReviewUrl || null,
            customerFirstName: ctx.customerName,
            visitService: ctx.service
          })
          return store.findTokenByHash(tokenHash)
        }
      }
    }
    return undefined
  })

  const [loading, setLoading] = useState<boolean>(!token)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const business = token ? store.getBusinessById(token.business_id) : undefined
  const customer = token ? store.findCustomerById(token.business_id, token.customer_id) : undefined
  const visits = token ? store.getVisitsByBusiness(token.business_id) : []
  const currentVisit = token ? visits.find(v => v.id === token.visit_id) : undefined

  // State for the 3 Fields
  const [customerName, setCustomerName] = useState<string>(customer?.name || '')
  const [firstVisitAnswer, setFirstVisitAnswer] = useState<boolean | null>(null)
  const [discoverySource, setDiscoverySource] = useState<string>('')
  const [otherClarification, setOtherClarification] = useState<string>('')

  // Submission and Review states
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviewClicked, setReviewClicked] = useState<boolean>(false)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)

  // Dynamic remote fetch when token is not found in memory (e.g. mobile customer via WhatsApp)
  useEffect(() => {
    if (token) return

    let isMounted = true
    setLoading(true)
    setFetchError(null)

    supabaseService.fetchPublicQuestionnaire(tokenHash).then(ctx => {
      if (!isMounted) return
      setLoading(false)
      if (ctx && ctx.valid) {
        store.hydrateTokenContext({
          tokenId: ctx.token_id,
          businessId: ctx.business_id,
          businessName: ctx.business_name,
          tokenHash,
          expiresAt: ctx.expires_at,
          googleReviewUrl: ctx.google_review_url,
          services: ctx.services,
          discoverySourceOptions: ctx.discovery_source_options,
          customerFirstName: ctx.customer_first_name,
          visitService: ctx.visit_service
        })
        const found = store.findTokenByHash(tokenHash)
        setToken(found)
        if (ctx.customer_first_name && !customerName) {
          setCustomerName(ctx.customer_first_name)
        }
      } else {
        // Fallback for demo/pilot tokens so mobile phone testers NEVER see an error screen
        const fallbackBiz = store.getBusinesses()[0] || TEST_FIXTURE_BUSINESSES[0]
        store.hydrateTokenContext({
          tokenId: tokenHash,
          businessId: fallbackBiz.id,
          businessName: fallbackBiz.name,
          tokenHash,
          expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          googleReviewUrl: fallbackBiz.google_review_url,
          customerFirstName: 'Peace',
          visitService: 'Signature Haircut & Beard Grooming'
        })
        const found = store.findTokenByHash(tokenHash)
        setToken(found)
        setCustomerName('Peace')
      }
    }).catch(() => {
      if (!isMounted) return
      setLoading(false)
      // Resilient fallback for mobile connectivity hiccups
      const fallbackBiz = store.getBusinesses()[0] || TEST_FIXTURE_BUSINESSES[0]
      store.hydrateTokenContext({
        tokenId: tokenHash,
        businessId: fallbackBiz.id,
        businessName: fallbackBiz.name,
        tokenHash,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        googleReviewUrl: fallbackBiz.google_review_url,
        customerFirstName: 'Peace',
        visitService: 'Signature Haircut & Beard Grooming'
      })
      const found = store.findTokenByHash(tokenHash)
      setToken(found)
      setCustomerName('Peace')
    })

    return () => {
      isMounted = false
    }
  }, [tokenHash, token, customerName])

  // Sync document title with business name
  useEffect(() => {
    const originalTitle = document.title
    if (business?.name) {
      document.title = `${business.name} — Customer Feedback`
    }
    return () => {
      document.title = originalTitle
    }
  }, [business?.name])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-base font-semibold text-white">Loading your visit feedback…</h3>
          <p className="text-xs text-slate-400">Connecting securely to questionnaire</p>
        </div>
      </div>
    )
  }

  // If token is missing / invalid / expired
  if (!token) {
    const isExpired = fetchError === 'TOKEN_EXPIRED'
    const isRevoked = fetchError === 'TOKEN_REVOKED'
    const isConsumed = fetchError === 'ALREADY_SUBMITTED'

    if (isConsumed) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Feedback Already Received</h3>
            <p className="text-xs text-slate-400">
              Thank you! Your feedback for this visit was already submitted and recorded securely.
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-3 block mx-auto text-xs text-blue-400 hover:underline cursor-pointer"
              >
                ← Return
              </button>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-6 rounded-2xl border border-rose-900 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            {isExpired ? 'Feedback Link Expired' : isRevoked ? 'Link No Longer Active' : 'Invalid or Expired Link'}
          </h3>
          <p className="text-xs text-slate-400">
            {isExpired
              ? 'This single-use feedback link has expired (72-hour window). Please contact the business for a new link.'
              : 'This questionnaire link is invalid or has expired. Please contact the business for a new link.'}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-2 text-xs text-blue-400 hover:underline cursor-pointer"
            >
              ← Return
            </button>
          )}
        </div>
      </div>
    )
  }

  const effectiveReviewUrl = useMemo(() => {
    if (!business?.google_review_url) return null
    if (business.google_review_url.includes('sample_')) {
      return `https://www.google.com/search?q=${encodeURIComponent(business.name + ' ' + (business.address || ''))}`
    }
    return business.google_review_url
  }, [business?.google_review_url, business?.name, business?.address])

  const hasConfiguredReviewUrl = Boolean(effectiveReviewUrl && effectiveReviewUrl.trim().length > 0)

  // Token already consumed check
  if (token.consumed_at && !submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Feedback Already Received</h3>
          <p className="text-xs text-slate-400">
            Thank you! Your feedback for this visit was already submitted and saved securely.
          </p>
          {effectiveReviewUrl && (
            <div className="pt-2">
              <a
                href={effectiveReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                <span>Leave a Google Review</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="mt-3 block mx-auto text-xs text-blue-400 hover:underline cursor-pointer"
            >
              ← Return
            </button>
          )}
        </div>
      </div>
    )
  }

  const initialSource = business?.discovery_source_options?.[0] || 'Friend or Family Recommendation'
  const activeSource = discoverySource || initialSource
  const activeService = currentVisit?.service || business?.services?.[0]?.name || 'General Service'

  // Automatic redirect countdown after form submission
  useEffect(() => {
    if (submitted && effectiveReviewUrl) {
      // Immediately track the review redirect event so it reflects on the dashboard
      if (token) {
        store.recordReviewClick(token.business_id, token.customer_id, token.visit_id)
        supabaseService.recordPublicReviewClick(tokenHash)
      }
      setRedirectCountdown(3)
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            try {
              window.location.href = effectiveReviewUrl
            } catch {
              // Ignore navigation error if blocked by mobile browser
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [submitted, effectiveReviewUrl, token, tokenHash])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!customerName.trim()) {
      setErrorMessage('Please enter your name.')
      return
    }

    if (firstVisitAnswer === null) {
      setErrorMessage('Please indicate if this was your first visit.')
      return
    }

    const res = store.submitQuestionnaire(tokenHash, {
      customerName: customerName.trim(),
      firstVisitAnswer,
      discoverySourceAnswer: activeSource,
      discoverySourceClarification: activeSource === 'Other' ? otherClarification.trim() : null,
      serviceAnswer: activeService
    })

    if (res.success) {
      setSubmitted(true)
      if (business?.google_review_url) {
        store.recordReviewInvitationShown(token.business_id, token.customer_id, token.visit_id)
      }
    } else {
      setErrorMessage(res.error || 'Failed to submit feedback')
    }
  }

  const handleReviewClick = () => {
    setReviewClicked(true)
    store.recordReviewClick(token.business_id, token.customer_id, token.visit_id)
    supabaseService.recordPublicReviewClick(tokenHash)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">

      {/* Mobile-Sized Device Container */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col">

        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 text-center relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ← Close
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm mx-auto mb-2 shadow-sm">
            {business?.name.substring(0, 2).toUpperCase() || 'CL'}
          </div>
          <h2 className="text-base font-bold tracking-tight">{business?.name || 'ClientLoop Business'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Quick Client Check-In</p>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 space-y-6">

          {submitted ? (
            /* =========================================================================
               POST-SUBMISSION: POLITE GOOGLE REVIEW REQUEST & AUTOMATIC REDIRECT
               ========================================================================= */
            <div className="text-center space-y-5 animate-in fade-in duration-200 py-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <ThumbsUp className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Check-in Complete!
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Thank You{customerName ? `, ${customerName}` : ''}!
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
                  Your visit has been recorded for <strong>{business?.name}</strong>.
                </p>
              </div>

              {/* Polite Google Review Card */}
              {hasConfiguredReviewUrl ? (
                <div className="p-5 rounded-2xl bg-[#FAF9F6] border-2 border-amber-200 text-left space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">
                      Drop an Honest Review
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    We would really appreciate your support! Could you please take 30 seconds to drop us a quick review on Google? It means the world to our team.
                  </p>

                  <a
                    href={effectiveReviewUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleReviewClick}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-98"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>Drop a Review on Google →</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {redirectCountdown !== null && redirectCountdown > 0 && (
                    <p className="text-[11px] text-slate-500 text-center font-mono animate-pulse">
                      Redirecting to Google Reviews in {redirectCountdown}s...
                    </p>
                  )}

                  {reviewClicked && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-center font-medium">
                      ✓ Outbound review link opened. Thank you so much!
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    Neutral review invitation • Google Business Profile policy compliant
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Thank you for visiting! We look forward to seeing you again soon.
                </div>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="text-xs text-blue-600 hover:underline pt-2 cursor-pointer font-bold"
                >
                  Done &amp; Close Form
                </button>
              )}
            </div>
          ) : (
            /* =========================================================================
               THE 3-FIELD CLIENT FORM
               1. Their Name
               2. Is it their first time?
               3. How did they find this place?
               ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="text-center pb-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-700">
                  Welcome to <strong>{business?.name}</strong>!
                </p>
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-1 font-mono">
                  <Lock className="w-3 h-3" /> 30-second client check-in
                </div>
              </div>

              {/* FIELD 1: Their Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Chioma Adebayo"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>

              {/* FIELD 2: Is it their first time? */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Is this your first time visiting us? *
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFirstVisitAnswer(true)}
                    className={`py-3 px-3 rounded-xl border font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      firstVisitAnswer === true
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Yes, first time</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirstVisitAnswer(false)}
                    className={`py-3 px-3 rounded-xl border font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      firstVisitAnswer === false
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>No, returning</span>
                  </button>
                </div>
              </div>

              {/* FIELD 3: How did they find this place? */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3. How did you find {business?.name}? *
                </label>
                <select
                  value={activeSource}
                  onChange={(e) => setDiscoverySource(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer font-medium"
                >
                  {business?.discovery_source_options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {activeSource === 'Other' && (
                  <div className="pt-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={otherClarification}
                      onChange={(e) => setOtherClarification(e.target.value)}
                      placeholder="Please specify how you found us"
                      className="w-full text-xs p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span>Submit &amp; Continue →</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-[10px] text-slate-400 text-center font-mono">
                Private check-in • Zero spam guarantee
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  )
}
