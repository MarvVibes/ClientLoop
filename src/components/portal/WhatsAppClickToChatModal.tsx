// ====================================================================
// CLIENTLOOP MANUAL WHATSAPP CLICK-TO-CHAT DISPATCH MODAL
// Opens WhatsApp App (mobile deep-link) or WhatsApp Web with pre-filled message
// Staff reviews message inside WhatsApp and taps Send.
// ====================================================================

import React, { useState, useMemo } from 'react'
import {
  X,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Laptop,
  ShieldCheck,
  AlertCircle,
  Star,
  Sparkles
} from 'lucide-react'
import { Business, Customer, Visit, QuestionnaireToken } from '../../lib/types/database'
import { store } from '../../lib/services/store'
import {
  buildFollowupMessageText,
  formatPhoneForWhatsApp,
  DEFAULT_WHATSAPP_INVITATION_TEMPLATE,
  DIRECT_GOOGLE_REVIEW_TEMPLATE
} from '../../lib/whatsapp/clickToChat'
import { buildQuestionnaireUrl } from '../../lib/navigation/urlRouter'

interface WhatsAppClickToChatModalProps {
  isOpen: boolean
  onClose: () => void
  business: Business
  customer: Customer
  visit: Visit
  onSuccess?: () => void
}

export const WhatsAppClickToChatModal: React.FC<WhatsAppClickToChatModalProps> = ({
  isOpen,
  onClose,
  business,
  customer,
  visit,
  onSuccess
}) => {
  const [templateType, setTemplateType] = useState<'questionnaire' | 'direct_review'>('questionnaire')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null)

  if (!isOpen) return null

  // Ensure single-use token exists for this visit (stable across renders)
  const token: QuestionnaireToken = (() => {
    let tok = store.findTokenByVisitId(visit.id)
    if (!tok) {
      tok = store.createQuestionnaireToken(business.id, visit.id, customer.id)
    }
    return tok
  })()

  // Determine business country prefix
  const defaultCountry = business.timezone === 'Africa/Lagos' ? '+234' : '+1'

  // Validate phone number with correct default country
  const phoneRes = formatPhoneForWhatsApp(customer.normalized_phone, defaultCountry)
  const phoneError = !phoneRes.isValid
    ? `Invalid phone number: "${customer.normalized_phone}". Please update the customer's phone number.`
    : null

  // Build URLs only when phone is valid
  const questionnaireUrl = buildQuestionnaireUrl(token.token_hash)
  const activeTemplate = templateType === 'direct_review'
    ? DIRECT_GOOGLE_REVIEW_TEMPLATE
    : DEFAULT_WHATSAPP_INVITATION_TEMPLATE

  const prefilledText = buildFollowupMessageText(
    activeTemplate,
    customer.name || 'there',
    business.name,
    questionnaireUrl,
    business.google_review_url
  )
  const encodedText = encodeURIComponent(prefilledText)

  // Official universal WhatsApp URL:
  // - On mobile: opens WhatsApp app with prefilled text
  // - On desktop: opens WhatsApp page with "Continue to chat" and opens Desktop app or WhatsApp Web
  const universalUrl = `https://api.whatsapp.com/send?phone=${phoneRes.digitsOnly}&text=${encodedText}`
  const webUrl = `https://web.whatsapp.com/send?phone=${phoneRes.digitsOnly}&text=${encodedText}`
  const nativeAppUrl = `whatsapp://send?phone=${phoneRes.digitsOnly}&text=${encodedText}`

  const handleDispatchTracking = (channel: 'wa_me' | 'whatsapp_web' | 'whatsapp_app') => {
    store.recordWhatsAppDispatch(business.id, visit.id, customer.id, channel)
    setDispatchStatus(`Opening WhatsApp via ${channel === 'whatsapp_web' ? 'WhatsApp Web' : 'WhatsApp'}… Tap Send to deliver the message!`)
    onSuccess?.()
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(prefilledText)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea')
      ta.value = prefilledText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(questionnaireUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = questionnaireUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Send WhatsApp Follow-up</h3>
              <p className="text-xs text-slate-400">
                To {customer.name || 'Client'} · {customer.normalized_phone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">

          {/* Phone Error */}
          {phoneError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">{phoneError}</p>
            </div>
          )}

          {/* Workflow Explanation Banner */}
          {!phoneError && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>How it works:</strong> Click <em>Open WhatsApp App</em> below — WhatsApp will open with the message already typed. Just tap <strong>Send</strong> inside WhatsApp to deliver it to the customer.
              </div>
            </div>
          )}

          {/* Recipient Details */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer</span>
              <span className="text-xs font-bold text-slate-900">{customer.name || 'Unnamed Guest'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Service</span>
              <span className="text-xs font-semibold text-slate-900">{visit.service}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">WhatsApp Number</span>
              <span className="text-xs font-mono font-bold text-slate-900">{customer.normalized_phone}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Feedback Link</span>
              <span className="text-xs font-mono text-slate-600 truncate block">
                {token.token_hash.substring(0, 10)}… (anonymous)
              </span>
            </div>
          </div>

          {/* Message Type Selector */}
          {!phoneError && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">
                Follow-up Link Option
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('questionnaire')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    templateType === 'questionnaire'
                      ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Form + Auto-Redirect</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    3 quick questions, then auto-redirects customer to Google Review.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('direct_review')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    templateType === 'direct_review'
                      ? 'bg-amber-50/80 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                    <span>Direct Google Review</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Sends customer directly to your Google Review URL.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Message Preview */}
          {!phoneError && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Message Preview
                </label>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText ? 'Copied!' : 'Copy text'}</span>
                </button>
              </div>

              {/* WhatsApp-style chat bubble */}
              <div className="p-3.5 rounded-2xl bg-[#EFEAE2] border border-[#DAD3C8] shadow-inner">
                <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-xs text-xs space-y-2 border border-slate-100 max-w-sm">
                  <p className="leading-relaxed whitespace-pre-wrap text-slate-900">{prefilledText}</p>
                  <div className="text-[10px] text-slate-400 text-right">Preview · not yet sent</div>
                </div>
              </div>
            </div>
          )}

          {/* Questionnaire URL */}
          {!phoneError && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-semibold block">Feedback URL (included in message)</span>
                <span className="text-xs font-mono text-blue-700 truncate block">{questionnaireUrl}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Dispatch Status */}
          {dispatchStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{dispatchStatus}</span>
            </div>
          )}

        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2.5">

          {!phoneError && (
            <>
              {/* Primary: Universal WhatsApp link */}
              <a
                href={universalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDispatchTracking('wa_me')}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Open WhatsApp &amp; Send</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              {/* Secondary row */}
              <div className="flex gap-2">
                <a
                  href={webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleDispatchTracking('whatsapp_web')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>WhatsApp Web</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                <a
                  href={nativeAppUrl}
                  onClick={() => handleDispatchTracking('whatsapp_app')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                  <span>WhatsApp App</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            </>
          )}

          {/* Always show Close */}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
          >
            Close
          </button>

        </div>

      </div>
    </div>
  )
}
