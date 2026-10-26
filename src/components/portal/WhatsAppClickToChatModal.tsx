// ====================================================================
// CLIENTLOOP MANUAL WHATSAPP CLICK-TO-CHAT DISPATCH MODAL
// Enables Staff to Prefill and Open WhatsApp (Mobile/Web) for Follow-up
// Zero Developer Account Required • Strictly Compliant Workflow
// ====================================================================

import React, { useState, useEffect } from 'react'
import { 
  X, 
  MessageCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Phone, 
  Smartphone, 
  Laptop, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react'
import { Business, Customer, Visit, QuestionnaireToken } from '../../lib/types/database'
import { store } from '../../lib/services/store'
import { 
  generateWhatsAppClickToChat, 
  DEFAULT_WHATSAPP_INVITATION_TEMPLATE,
  formatPhoneForWhatsApp 
} from '../../lib/whatsapp/clickToChat'

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
  // Ensure single-use token exists for this visit
  const [token, setToken] = useState<QuestionnaireToken>(() => {
    let tok = store.findTokenByVisitId(visit.id)
    if (!tok) {
      tok = store.createQuestionnaireToken(business.id, visit.id, customer.id)
    }
    return tok
  })

  const [messageTemplate, setMessageTemplate] = useState<string>(DEFAULT_WHATSAPP_INVITATION_TEMPLATE)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null)

  if (!isOpen) return null

  // Generate click to chat details
  const chatData = generateWhatsAppClickToChat({
    businessId: business.id,
    customerId: customer.id,
    visitId: visit.id,
    phone: customer.normalized_phone,
    customerName: customer.name,
    businessName: business.name,
    tokenHash: token.token_hash,
    customMessageTemplate: messageTemplate
  })

  const handleOpenMobile = () => {
    // Audit log
    store.recordAuditEvent(business.id, 'staff_user', 'open_whatsapp_mobile', 'visits', {
      visitId: visit.id,
      customerId: customer.id,
      workflow: 'click_to_chat_mobile'
    })
    setDispatchStatus('Opened in WhatsApp. Please tap Send inside WhatsApp to dispatch to customer.')
    window.open(chatData.mobileUrl, '_blank')
    if (onSuccess) onSuccess()
  }

  const handleOpenWeb = () => {
    store.recordAuditEvent(business.id, 'staff_user', 'open_whatsapp_web', 'visits', {
      visitId: visit.id,
      customerId: customer.id,
      workflow: 'click_to_chat_web'
    })
    setDispatchStatus('Opened WhatsApp Web in new tab. Please click Send inside WhatsApp Web.')
    window.open(chatData.webUrl, '_blank')
    if (onSuccess) onSuccess()
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(chatData.prefilledText)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(chatData.questionnaireUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // Fallback
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
              <h3 className="text-base font-bold text-white">Manual WhatsApp Follow-up</h3>
              <p className="text-xs text-slate-400">
                Send to {customer.name || 'Client'} ({customer.normalized_phone})
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

          {/* Workflow Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Staff-Controlled Dispatch:</strong> This generates a direct, pre-filled WhatsApp conversation link. You or your staff tap <em>Open WhatsApp</em>, review the message in WhatsApp, and tap <em>Send</em>. No Meta developer account or API approval needed.
            </div>
          </div>

          {/* Recipient Details */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer</span>
              <span className="text-xs font-bold text-slate-900">{customer.name || 'Unnamed Guest'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Service Rendered</span>
              <span className="text-xs font-semibold text-slate-900">{visit.service}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">WhatsApp Number</span>
              <span className="text-xs font-mono font-bold text-slate-900">{customer.normalized_phone}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Single-Use Token</span>
              <span className="text-xs font-mono text-slate-600 truncate block">
                {token.token_hash.substring(0, 10)}... (Zero PII)
              </span>
            </div>
          </div>

          {/* Message Preview & Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                Message Preview (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#EFEAE2] border border-[#DAD3C8] text-slate-900 shadow-inner">
              <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-xs text-xs space-y-2 border border-slate-100 max-w-sm">
                <p className="leading-relaxed whitespace-pre-wrap">{chatData.prefilledText}</p>
                <div className="text-[10px] text-slate-400 text-right">Preview</div>
              </div>
            </div>
          </div>

          {/* Secure Questionnaire Link Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold block">Encrypted Questionnaire URL</span>
              <span className="text-xs font-mono text-blue-700 truncate block">{chatData.questionnaireUrl}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {dispatchStatus && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{dispatchStatus}</span>
            </div>
          )}

        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={handleOpenMobile}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open WhatsApp Mobile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleOpenWeb}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Laptop className="w-4 h-4" />
            <span>Open WhatsApp Web</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  )
}
