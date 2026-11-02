// ====================================================================
// CLIENTLOOP TENANT-SPECIFIC GOOGLE REVIEW REDIRECT & TRACKING PAGE
// Redirects customers from Google Forms confirmation to Google Reviews
// Records review_link_clicked telemetry with strict open-redirect prevention
// ====================================================================

import React, { useEffect, useState, useMemo } from 'react'
import { Star, ExternalLink, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { store } from '../../lib/services/store'
import { googleReviewSync } from '../../lib/reviews/googleReviewSync'
import { supabaseService } from '../../lib/supabase/service'
import { decodeLinkContext } from '../../lib/navigation/urlRouter'
import { Business } from '../../lib/types/database'

interface ReviewRedirectPageProps {
  identifier: string
  customerId?: string
  visitId?: string
  source?: string
  onClose?: () => void
}

export const ReviewRedirectPage: React.FC<ReviewRedirectPageProps> = ({
  identifier,
  customerId,
  visitId,
  source = 'google_form',
  onClose
}) => {
  const [business, setBusiness] = useState<Business | null>(() => {
    return store.getBusinessByIdOrSlug(identifier) || null
  })
  const [isLoading, setIsLoading] = useState(!business)
  const [error, setError] = useState<string | null>(null)
  const [hasRecordedClick, setHasRecordedClick] = useState(false)
  const [countdown, setCountdown] = useState<number>(2)

  // 1. Resolve business from local store, portable context, or Supabase
  useEffect(() => {
    if (business) return

    let isMounted = true

    const resolveBusiness = async () => {
      try {
        // A. Check portable URL context (?d=...)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const encodedContext = urlParams.get('d')
          if (encodedContext) {
            const ctx = decodeLinkContext(encodedContext)
            if (ctx && ctx.businessName) {
              const portableBiz: Business = {
                id: ctx.businessId || identifier,
                name: ctx.businessName,
                slug: identifier,
                category: 'Service Business',
                timezone: 'Africa/Lagos',
                address: null,
                google_review_url: ctx.googleReviewUrl || null,
                branding: { primary_color: '#2563EB', logo_url: null },
                services: [],
                discovery_source_options: [],
                messaging_config: { provider: 'manual_click_to_chat', cooldown_hours: 72, auto_send_on_visit: false, whatsapp_phone_number_id: null },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              store.createBusiness(portableBiz)
              if (isMounted) {
                setBusiness(portableBiz)
                setIsLoading(false)
              }
              return
            }
          }
        }

        // B. Fetch from remote Supabase via security-definer RPC / query
        const remoteInfo = await supabaseService.fetchBusinessForReviewRedirect(identifier)
        if (remoteInfo && remoteInfo.valid && isMounted) {
          const remoteBiz: Business = {
            id: remoteInfo.business_id,
            name: remoteInfo.business_name,
            slug: remoteInfo.business_slug || identifier,
            category: 'Service Business',
            timezone: 'Africa/Lagos',
            address: remoteInfo.business_address || null,
            google_review_url: remoteInfo.google_review_url,
            branding: { primary_color: '#2563EB', logo_url: null },
            services: [],
            discovery_source_options: [],
            messaging_config: { provider: 'manual_click_to_chat', cooldown_hours: 72, auto_send_on_visit: false, whatsapp_phone_number_id: null },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          store.createBusiness(remoteBiz)
          setBusiness(remoteBiz)
          setIsLoading(false)
          return
        }

        // C. Fallback: check all businesses in store
        const allBiz = store.getBusinesses()
        if (allBiz.length > 0 && isMounted) {
          const matched = allBiz.find(b => b.id === identifier || b.slug === identifier) || allBiz[0]
          setBusiness(matched)
          setIsLoading(false)
          return
        }

        if (isMounted) {
          setError('Business workspace not found. Please verify the review link.')
          setIsLoading(false)
        }
      } catch {
        if (isMounted) {
          setError('Unable to load business review information.')
          setIsLoading(false)
        }
      }
    }

    resolveBusiness()

    return () => {
      isMounted = false
    }
  }, [identifier, business])

  // 2. Validate destination URL strictly against Google domain whitelist
  const effectiveDestinationUrl = useMemo(() => {
    if (!business?.google_review_url) return null

    // For sample mock URLs, construct a valid search URL on google.com
    if (business.google_review_url.includes('sample_')) {
      return `https://www.google.com/search?q=${encodeURIComponent(business.name + ' ' + (business.address || ''))}`
    }

    const validation = googleReviewSync.validateGoogleReviewUrl(business.google_review_url)
    if (!validation.isValid) {
      return null
    }

    return validation.normalizedUrl || business.google_review_url
  }, [business])

  // 3. Record review click and execute redirection
  useEffect(() => {
    if (!business || !effectiveDestinationUrl || hasRecordedClick) return

    // Record review click telemetry
    setHasRecordedClick(true)
    store.recordReviewClick(business.id, customerId || undefined, visitId || undefined, source)
    supabaseService.recordPublicReviewClickByBusiness(business.id, customerId || undefined, visitId || undefined, source)

    // Countdown and automatic redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          try {
            window.location.replace(effectiveDestinationUrl)
          } catch {
            window.location.href = effectiveDestinationUrl
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [business, effectiveDestinationUrl, hasRecordedClick, customerId, visitId, source])

  // Direct manual navigation
  const handleProceedImmediately = () => {
    if (!effectiveDestinationUrl) return
    if (!hasRecordedClick && business) {
      setHasRecordedClick(true)
      store.recordReviewClick(business.id, customerId || undefined, visitId || undefined, source)
      supabaseService.recordPublicReviewClickByBusiness(business.id, customerId || undefined, visitId || undefined, source)
    }
    window.location.href = effectiveDestinationUrl
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white">Connecting to Google Reviews...</h2>
        <p className="text-xs text-slate-400 mt-1">Preparing verified review destination</p>
      </div>
    )
  }

  // Error state
  if (error || !business) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-950 p-7 rounded-3xl border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Review Link Not Available</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {error || 'The requested business review link could not be located.'}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Destination validation failure / open redirect prevention error
  if (!effectiveDestinationUrl) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-950 p-7 rounded-3xl border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Google Review Link Not Set</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              <strong>{business.name}</strong> has not configured an official Google review URL yet, or the configured URL is invalid.
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            For security, ClientLoop only redirects to verified HTTPS Google Maps and Review domains.
          </p>
        </div>
      </div>
    )
  }

  // Active Redirection Screen
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-6 text-center animate-in fade-in duration-200">
        
        {/* Business Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Star className="w-8 h-8 fill-amber-400 text-amber-400 animate-pulse" />
        </div>

        {/* Heading & Context */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Thank you for visiting {business.name}!</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            Taking You to Google Reviews
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            Your review means the world to our team. Redirecting you to leave your feedback directly on Google.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleProceedImmediately}
            className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-98"
          >
            <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
            <span>Open Google Review Page Now</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          {countdown > 0 ? (
            <p className="text-[11px] text-slate-400 font-mono">
              Redirecting automatically in {countdown}s...
            </p>
          ) : (
            <p className="text-[11px] text-emerald-400 font-medium">
              Redirect initiated. Click above if your browser did not navigate.
            </p>
          )}
        </div>

        {/* Security & Audit Notice */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Verified Google Destination
          </span>
          <span className="font-mono text-[10px] text-slate-500 uppercase">
            Click Logged
          </span>
        </div>

      </div>
    </div>
  )
}
