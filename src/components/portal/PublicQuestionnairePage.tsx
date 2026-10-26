import React, { useState } from 'react'
import { store } from '../../lib/services/store'
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Star,
  ShieldCheck,
  ThumbsUp,
  AlertCircle,
  Lock,
  ArrowRight
} from 'lucide-react'

interface PublicQuestionnairePageProps {
  tokenHash: string
  onClose?: () => void
}

export const PublicQuestionnairePage: React.FC<PublicQuestionnairePageProps> = ({
  tokenHash,
  onClose
}) => {
  const token = store.findTokenByHash(tokenHash)

  // State
  const [firstVisitAnswer, setFirstVisitAnswer] = useState<boolean | null>(null)
  const [discoverySource, setDiscoverySource] = useState<string>('')
  const [otherClarification, setOtherClarification] = useState<string>('')
  const [serviceAnswer, setServiceAnswer] = useState<string>('')
  const [rating, setRating] = useState<number>(5)
  const [feedbackText, setFeedbackText] = useState<string>('')
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviewClicked, setReviewClicked] = useState<boolean>(false)

  // If token is missing
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-6 rounded-2xl border border-rose-900 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Invalid or Expired Link</h3>
          <p className="text-xs text-slate-400">
            This questionnaire link is invalid or has expired. Please contact the business for a new link.
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-2 text-xs text-blue-400 hover:underline"
            >
              ← Return
            </button>
          )}
        </div>
      </div>
    )
  }

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
          {onClose && (
            <button
              onClick={onClose}
              className="mt-2 text-xs text-blue-400 hover:underline"
            >
              ← Return
            </button>
          )}
        </div>
      </div>
    )
  }

  const business = store.getBusinessById(token.business_id)
  const customer = store.findCustomerById(token.business_id, token.customer_id)
  const visits = store.getVisitsByBusiness(token.business_id)
  const currentVisit = visits.find(v => v.id === token.visit_id)

  const initialService = currentVisit?.service || business?.services[0]?.name || 'General Service'
  const initialSource = business?.discovery_source_options[0] || 'Friend or family referral'

  // Initialize defaults
  const activeService = serviceAnswer || initialService
  const activeSource = discoverySource || initialSource

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (firstVisitAnswer === null) {
      setErrorMessage('Please answer if this was your first visit.')
      return
    }

    const res = store.submitQuestionnaire(tokenHash, {
      firstVisitAnswer,
      discoverySourceAnswer: activeSource,
      discoverySourceClarification: activeSource === 'Other' ? otherClarification.trim() : null,
      serviceAnswer: activeService,
      rating,
      feedbackText: feedbackText.trim() || null
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
  }

  const hasConfiguredReviewUrl = Boolean(business?.google_review_url && business.google_review_url.trim().length > 0)

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">

      {/* Mobile-Sized Device Container */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col">

        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 text-center relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-xs text-slate-400 hover:text-white"
            >
              ← Close
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs mx-auto mb-2 shadow-xs">
            {business?.name.substring(0, 2).toUpperCase() || 'CL'}
          </div>
          <h2 className="text-base font-bold tracking-tight">{business?.name || 'ClientLoop Business'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{business?.category || 'Service Business'}</p>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 space-y-6">

          {submitted ? (
            /* THANK YOU & OPTIONAL NEUTRAL GOOGLE REVIEW PROMPT SCREEN */
            <div className="text-center space-y-5 animate-in fade-in duration-200 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <ThumbsUp className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Thank You{customer?.name ? `, ${customer.name}` : ''}!
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
                  Your feedback has been received and saved privately in {business?.name}’s workspace. We appreciate your time!
                </p>
              </div>

              {/* Optional Neutral Google Review Card — ONLY shown if business has configured review URL */}
              {hasConfiguredReviewUrl ? (
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-left space-y-3 card-shadow">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Optional Public Review
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Thank you for sharing your feedback. We appreciate your time. If you’d like to share your experience with others, you can leave us an honest review on Google.
                  </p>

                  <a
                    href={business!.google_review_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleReviewClick}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    <span>Leave an honest review on Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {reviewClicked && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-center font-medium">
                      ✓ Outbound link opened. Thank you for your support!
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    Neutral review invitation • Google Business Profile policy compliant • Zero gating or incentives
                  </p>
                </div>
              ) : null}

              {onClose && (
                <button
                  onClick={onClose}
                  className="text-xs text-blue-600 hover:underline pt-2"
                >
                  Done &amp; Close Questionnaire
                </button>
              )}
            </div>
          ) : (
            /* 4-QUESTION MOBILE FORM */
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="text-center pb-2 border-b border-slate-100">
                <p className="text-xs text-slate-600">
                  Hi <strong>{customer?.name || 'there'}</strong>! How was your visit today?
                </p>
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-1 font-mono">
                  <Lock className="w-3 h-3" /> Secure 60-second questionnaire
                </div>
              </div>

              {/* Q1: First Visit? */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  1. Was this your first visit with us? *
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFirstVisitAnswer(true)}
                    className={`py-2 px-3 rounded-xl border font-semibold transition-all ${firstVisitAnswer === true
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    Yes, first time
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirstVisitAnswer(false)}
                    className={`py-2 px-3 rounded-xl border font-semibold transition-all ${firstVisitAnswer === false
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    No, I'm returning
                  </button>
                </div>
              </div>

              {/* Q2: How did you hear about us? */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  2. How did you hear about {business?.name}? *
                </label>
                <select
                  value={activeSource}
                  onChange={(e) => setDiscoverySource(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {business?.discovery_source_options.map((opt) => (
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
                      placeholder="Please specify how you heard of us (optional)"
                      className="w-full text-xs p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Q3: Service Received */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  3. Service received today *
                </label>
                <select
                  value={activeService}
                  onChange={(e) => setServiceAnswer(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {business?.services.map((srv) => (
                    <option key={srv.id} value={srv.name}>
                      {srv.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Q4: Experience Rating (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  4. Overall satisfaction rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors ${rating >= num
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                    >
                      {num} ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Q5: Optional Feedback */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  5. Comments or thoughts for our team? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you loved or where we can improve..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>

              {errorMessage && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Submit Feedback</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-[10px] text-slate-400 text-center">
                Your phone number is verified securely via this link. No re-entry needed.
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  )
}
