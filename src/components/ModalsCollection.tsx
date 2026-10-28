import React, { useState } from 'react'
import { Modal } from './Modal'
import { 
  Building2, 
  Lock, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ExternalLink,
  Zap,
  Phone,
  FileSpreadsheet
} from 'lucide-react'

// 1. SIGN IN MODAL
interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccessDemo?: (workspaceName: string) => void
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSuccessDemo }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      if (onSuccessDemo) {
        onClose()
        onSuccessDemo('ClientLoop Workspace')
      } else {
        setError('Sign-in is not yet enabled. Request early access to join the beta.')
      }
    }, 600)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in to ClientLoop"
      subtitle="Enter your email and password to access your business dashboard."
    >
      <form onSubmit={handleSignIn} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors"
          >
            {isLoading ? 'Signing in…' : 'Sign In →'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Don't have an account?{' '}
          <button type="button" onClick={onClose} className="text-blue-600 hover:underline font-semibold">Request early access</button>
        </p>
      </form>
    </Modal>
  )
}

// 2. EARLY ACCESS MODAL
interface EarlyAccessModalProps {
  isOpen: boolean
  onClose: () => void
  initialPlan?: string
}

export const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({ isOpen, onClose, initialPlan = 'Growth' }) => {
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [plan, setPlan] = useState(initialPlan)
  const [category, setCategory] = useState('salon')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSuccess(true)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Early Access"
      subtitle="Join the founding beta pool with locked-in grandfathered pricing."
    >
      {isSuccess ? (
        <div className="p-6 text-center space-y-3 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">You're on the list!</h4>
          <p className="text-xs text-slate-600">
            Thank you! We've received your request for <strong>{businessName || 'your business'}</strong> on the <strong>{plan}</strong> plan. We'll be in touch with onboarding details shortly.
          </p>
          <button
            onClick={() => {
              setIsSuccess(false)
              onClose()
            }}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Work Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Apex Studio"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Industry</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="salon">Salon &amp; Beauty</option>
                <option value="wellness">Wellness &amp; Medspa</option>
                <option value="repair">Auto &amp; Repair</option>
                <option value="hospitality">Hospitality &amp; Dining</option>
                <option value="professional">Professional Services</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Selected Early Access Tier</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Starter">Starter ($39/mo annual beta)</option>
              <option value="Growth">Growth ($79/mo annual beta)</option>
              <option value="Multi-Location Studio">Multi-Location Studio ($159/mo annual beta)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors"
            >
              Submit Early Access Request →
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            No payment required today • Grandfathered pricing guarantee
          </p>
        </form>
      )}
    </Modal>
  )
}

// 3. PRIVACY MODAL
export const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Privacy &amp; Architectural Policy"
      subtitle="How ClientLoop handles customer records, phone numbers, and WhatsApp consent."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs sm:text-sm text-slate-600 max-h-[60vh] overflow-y-auto pr-1">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-medium">
          <strong>Key Guarantee:</strong> ClientLoop is built with strict multi-tenant Row Level Security (RLS). Your customer directory is never shared, sold, or matched with any other business.
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">1. Phone Number Normalization &amp; Identity Scoping</h4>
          <p className="leading-relaxed">
            Customer phone numbers are normalized into the international E.164 standard to prevent duplicate records (e.g. converting local variations into a unified key). This lookup is strictly partitioned by your tenant's ID: the platform never searches or reveals phone matches across different workspaces.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">2. Single-Purpose Cryptographic Tokens</h4>
          <p className="leading-relaxed">
            Questionnaire links delivered via WhatsApp do not contain raw phone numbers, names, or unencrypted database IDs in the query string. Form URLs use short-lived, randomly generated cryptographic hashes that expire automatically.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">3. WhatsApp Consent Basis &amp; Opt-Out</h4>
          <p className="leading-relaxed">
            Possession of a customer's phone number alone is not consent for marketing broadcasts. ClientLoop supports transactional service follow-ups based on recent visits. If a customer replies "STOP" on WhatsApp, our webhook handler records an opt-out suppression flag, preventing any automated message sends.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">4. Data Export &amp; Sanitization</h4>
          <p className="leading-relaxed">
            Owners can export their database records at any time via CSV. All exported cells are sanitized against spreadsheet formula injection attacks (preventing malicious payloads like `=cmd|`).
          </p>
        </div>
      </div>
    </Modal>
  )
}

// 4. TERMS & REVIEW POLICY MODAL
export const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Integrity &amp; Platform Terms"
      subtitle="ClientLoop's strict compliance with Google Maps review guidelines and fair use."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs sm:text-sm text-slate-600 max-h-[60vh] overflow-y-auto pr-1">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium">
          <strong>Anti-Gating Notice:</strong> In strict compliance with Google's Business Profile guidelines, ClientLoop does not filter review links based on customer satisfaction scores or offer rewards for reviews.
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">1. Separation of Clicks from Submitted Reviews</h4>
          <p className="leading-relaxed">
            Google does not provide third-party platforms with individual reviewer identities. When a customer taps the Google review button on our thank-you page, ClientLoop logs this as an outbound interaction event. We do not claim a click guarantees a review was published.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">2. No Bribes or Conditional Incentives</h4>
          <p className="leading-relaxed">
            Businesses using ClientLoop agree not to offer discounts, cash, gifts, or contest entries conditioned on the customer leaving a positive Google review. Honest reviews reflect authentic customer experiences.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">3. Multi-Tenant Workspace Boundaries</h4>
          <p className="leading-relaxed">
            Each tenant is responsible for maintaining the confidentiality of staff login credentials. Staff members must only access the tenant workspaces for which they are authorized by the business owner.
          </p>
        </div>
      </div>
    </Modal>
  )
}

// 5. CONTACT MODAL
export const ContactModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contact ClientLoop Team"
      subtitle="Questions about integrations, pilot onboarding, or technical requirements?"
    >
      {submitted ? (
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Message Sent!</h4>
          <p className="text-xs text-slate-600">
            Thank you for reaching out. We'll get back to you within 1–2 business days.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              onClose()
            }}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitted(true)
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Your Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Work Email</label>
            <input
              type="email"
              required
              placeholder="alex@business.com"
              className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Message</label>
            <textarea
              rows={3}
              required
              placeholder="Tell us about your service business and what you'd like to achieve..."
              className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors"
            >
              Send Message →
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
