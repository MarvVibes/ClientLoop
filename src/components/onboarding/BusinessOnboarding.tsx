// ====================================================================
// CLIENTLOOP GUIDED BUSINESS ONBOARDING FLOW
// Resumable, multi-step onboarding wizard for new business owners
// Creates persistent business profile, services catalog, and membership
// ====================================================================

import React, { useState, useEffect } from 'react'
import { Logo } from '../Logo'
import { useAuth } from '../../lib/auth/AuthContext'
import { store, DEFAULT_DISCOVERY_SOURCES, generateUuid } from '../../lib/services/store'
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client'
import { Business } from '../../lib/types/database'
import { 
  Building2, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Globe, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react'

const DRAFT_STORAGE_KEY = 'clientloop_onboarding_draft'

export interface ServiceItem {
  id: string
  name: string
  default_price?: number
  default_duration_min?: number
}

const COMMON_CATEGORIES = [
  'Hair Salon & Barbershop',
  'Medspa, Aesthetics & Skincare',
  'Nail Salon & Lash Studio',
  'Massage & Wellness Spa',
  'Dental & Medical Clinic',
  'Auto Repair & Detailing',
  'Fitness Studio & Personal Training',
  'Tattoo & Piercing Studio',
  'Pet Grooming & Veterinary',
  'Home & Professional Services',
  'Other Service Business'
]

const TIMEZONE_OPTIONS = [
  { label: 'West Africa (Lagos, UTC+1)', value: 'Africa/Lagos' },
  { label: 'Eastern US (New York, UTC-5)', value: 'America/New_York' },
  { label: 'Central US (Chicago, UTC-6)', value: 'America/Chicago' },
  { label: 'Pacific US (Los Angeles, UTC-8)', value: 'America/Los_Angeles' },
  { label: 'United Kingdom (London, UTC+0)', value: 'Europe/London' },
  { label: 'Central Europe (Paris, Berlin, UTC+1)', value: 'Europe/Paris' },
  { label: 'South Africa (Johannesburg, UTC+2)', value: 'Africa/Johannesburg' },
  { label: 'East Africa (Nairobi, UTC+3)', value: 'Africa/Nairobi' },
  { label: 'India (Kolkata, UTC+5:30)', value: 'Asia/Kolkata' },
  { label: 'Gulf (Dubai, UTC+4)', value: 'Asia/Dubai' },
  { label: 'Coordinated Universal Time (UTC)', value: 'UTC' }
]

const CURRENCY_OPTIONS = [
  { label: '₦ Nigerian Naira (NGN)', value: 'NGN' },
  { label: '$ US Dollar (USD)', value: 'USD' },
  { label: '£ British Pound (GBP)', value: 'GBP' },
  { label: '€ Euro (EUR)', value: 'EUR' },
  { label: '$ Canadian Dollar (CAD)', value: 'CAD' },
  { label: '$ Australian Dollar (AUD)', value: 'AUD' },
  { label: 'R South African Rand (ZAR)', value: 'ZAR' },
  { label: 'KSh Kenyan Shilling (KES)', value: 'KES' },
  { label: 'GH₵ Ghanaian Cedi (GHS)', value: 'GHS' }
]

interface BusinessOnboardingProps {
  onComplete: (business: Business) => void
  onSignOut?: () => void
}

export const BusinessOnboarding: React.FC<BusinessOnboardingProps> = ({
  onComplete,
  onSignOut
}) => {
  const { user, refreshActiveBusiness } = useAuth()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Basics
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState(COMMON_CATEGORIES[0])
  const [country, setCountry] = useState('Nigeria')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [logoUrl, setLogoUrl] = useState('')

  // Step 2: Services
  const [services, setServices] = useState<ServiceItem[]>([
    { id: 'srv_1', name: 'Primary Service', default_price: 50, default_duration_min: 45 }
  ])
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [newServiceDuration, setNewServiceDuration] = useState('45')

  // Step 3: Discovery & Reviews
  const [discoverySources, setDiscoverySources] = useState<string[]>([...DEFAULT_DISCOVERY_SOURCES])
  const [newSourceInput, setNewSourceInput] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')
  const [cooldownHours, setCooldownHours] = useState(72)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const d = JSON.parse(saved)
        if (d.businessName) setBusinessName(d.businessName)
        if (d.category) setCategory(d.category)
        if (d.country) setCountry(d.country)
        if (d.city) setCity(d.city)
        if (d.phone) setPhone(d.phone)
        if (d.email) setEmail(d.email)
        if (d.currency) setCurrency(d.currency)
        if (d.timezone) setTimezone(d.timezone)
        if (d.logoUrl) setLogoUrl(d.logoUrl)
        if (d.services && d.services.length) setServices(d.services)
        if (d.discoverySources && d.discoverySources.length) setDiscoverySources(d.discoverySources)
        if (d.googleReviewUrl) setGoogleReviewUrl(d.googleReviewUrl)
        if (d.currentStep) setCurrentStep(d.currentStep)
      } else if (user?.email) {
        setEmail(user.email)
      }
    } catch {
      // Ignore parse errors
    }
  }, [user])

  // Save draft whenever state changes
  useEffect(() => {
    try {
      const draft = {
        businessName,
        category,
        country,
        city,
        phone,
        email,
        currency,
        timezone,
        logoUrl,
        services,
        discoverySources,
        googleReviewUrl,
        currentStep
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Ignore storage errors
    }
  }, [
    businessName,
    category,
    country,
    city,
    phone,
    email,
    currency,
    timezone,
    logoUrl,
    services,
    discoverySources,
    googleReviewUrl,
    currentStep
  ])

  // Service list management
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newServiceName.trim()) return

    const priceNum = newServicePrice.trim() ? parseFloat(newServicePrice) : undefined
    const durationNum = newServiceDuration.trim() ? parseInt(newServiceDuration, 10) : undefined

    setServices(prev => [
      ...prev,
      {
        id: `srv_${Math.random().toString(36).substring(2, 8)}`,
        name: newServiceName.trim(),
        default_price: isNaN(priceNum as number) ? undefined : priceNum,
        default_duration_min: isNaN(durationNum as number) ? undefined : durationNum
      }
    ])

    setNewServiceName('')
    setNewServicePrice('')
    setNewServiceDuration('45')
  }

  const handleRemoveService = (id: string) => {
    if (services.length <= 1) {
      alert('You must have at least one service listed.')
      return
    }
    setServices(prev => prev.filter(s => s.id !== id))
  }

  // Discovery options management
  const handleAddDiscoverySource = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newSourceInput.trim()
    if (!trimmed || discoverySources.includes(trimmed)) return
    setDiscoverySources(prev => [...prev, trimmed])
    setNewSourceInput('')
  }

  const handleRemoveDiscoverySource = (source: string) => {
    setDiscoverySources(prev => prev.filter(s => s !== source))
  }

  // Navigation validations
  const handleNext = () => {
    setError(null)
    if (currentStep === 1) {
      if (!businessName.trim()) {
        setError('Business name is required.')
        return
      }
      if (!city.trim()) {
        setError('City or business address is required.')
        return
      }
      setCurrentStep(2)
      return
    }

    if (currentStep === 2) {
      if (services.length === 0) {
        setError('Please configure at least one service offered by your business.')
        return
      }
      setCurrentStep(3)
      return
    }
  }

  // Final Step: Complete Onboarding & Save
  const handleCompleteSetup = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const slug = businessName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + `-${Math.random().toString(36).substring(2, 6)}`

      const newBusiness: Business = {
        id: generateUuid(),
        name: businessName.trim(),
        slug,
        category,
        timezone,
        address: `${city.trim()}, ${country}`,
        google_review_url: googleReviewUrl.trim() || null,
        branding: {
          primary_color: '#2563EB',
          logo_url: logoUrl.trim() || null
        },
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          default_price: s.default_price,
          default_duration_min: s.default_duration_min
        })),
        discovery_source_options: discoverySources,
        messaging_config: {
          provider: 'manual_click_to_chat',
          cooldown_hours: cooldownHours,
          auto_send_on_visit: true,
          whatsapp_phone_number_id: null
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // 1. Save to local store
      store.createBusiness(newBusiness)

      // 2. Persist to Supabase if connected
      if (supabase && isSupabaseConfigured() && user) {
        try {
          const { error: bizError } = await supabase.from('businesses').insert({
            name: newBusiness.name,
            slug: newBusiness.slug,
            category: newBusiness.category,
            timezone: newBusiness.timezone,
            address: newBusiness.address,
            google_review_url: newBusiness.google_review_url,
            branding: newBusiness.branding,
            services: newBusiness.services,
            discovery_source_options: newBusiness.discovery_source_options,
            messaging_config: newBusiness.messaging_config
          })

          if (bizError) {
            console.warn('Supabase business insert notice:', bizError.message)
          }

          // Fetch the created business ID from Supabase
          const { data: createdBiz } = await supabase
            .from('businesses')
            .select('id')
            .eq('slug', newBusiness.slug)
            .single()

          if (createdBiz) {
            newBusiness.id = createdBiz.id
            store.createBusiness(newBusiness)

            // Connect user membership as owner
            await supabase.from('business_memberships').insert({
              user_id: user.id,
              business_id: createdBiz.id,
              role: 'owner',
              status: 'active'
            })
          }
        } catch (remoteErr) {
          console.warn('Supabase remote persistence fallback:', remoteErr)
        }
      }

      // Clear draft
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      localStorage.setItem('clientloop_active_biz_id', newBusiness.id)

      await refreshActiveBusiness()
      onComplete(newBusiness)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize business setup'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500 hidden sm:inline">
            Logged in as <strong>{user?.email || 'Owner'}</strong>
          </span>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span className={currentStep >= 1 ? 'text-blue-600 font-bold' : ''}>
              1. Business Profile
            </span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-bold' : ''}>
              2. Services Catalog
            </span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-bold' : ''}>
              3. Review & Discovery
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Required field missing</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          {/* STEP 1: BUSINESS BASICS */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Tell us about your business</h2>
                <p className="text-xs text-slate-500 mt-1">
                  We'll customize your customer visit logs, timezone boundaries, and SMS/WhatsApp follow-ups.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Business Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Haven Hair Studio, Radiant Aesthetics"
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Industry / Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {COMMON_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Operating Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {CURRENCY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    City or Location Address *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Victoria Island, Lagos"
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Country
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Nigeria, United States"
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Timezone (Used for daily/weekly reporting boundaries)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {TIMEZONE_OPTIONS.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Business Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +234 803 123 4567"
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@yourbusiness.com"
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Google Review Link (URL) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Google Review Link (URL) *
                </label>
                <div className="relative">
                  <Star className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://maps.google.com/?cid=... or https://g.page/r/..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clients who complete their 3-question form via WhatsApp will automatically be redirected here to drop a review.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: SERVICES CATALOG */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Configure your primary services</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Staff will select from these services when recording client visits. You can add more anytime.
                </p>
              </div>

              {/* Existing Services List */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Active Services ({services.length})
                </label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {services.map((s, idx) => (
                    <div key={s.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {s.default_duration_min ? `${s.default_duration_min} mins` : 'Flexible duration'}
                            {s.default_price ? ` • ${currency} ${s.default_price}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(s.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Remove service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Service Sub-Form */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-3">
                <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Another Service
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Service name (e.g. Signature Cut & Styling)"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder={`Price (${currency})`}
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddService}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Add Service
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEWS & DISCOVERY */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review links & discovery attribution</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Connect your Google Review link and customize how clients answer "How did you hear about us?".
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Google Business Profile Review Link (Optional)
                </label>
                <div className="relative">
                  <Star className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/.../review or https://maps.google.com/?cid=..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Displayed on the thank-you page after clients submit questionnaire feedback. Never gated by sentiment.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Customer Discovery Options (Customizable)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {discoverySources.map(src => (
                    <span
                      key={src}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {src}
                      <button
                        type="button"
                        onClick={() => handleRemoveDiscoverySource(src)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSourceInput}
                    onChange={(e) => setNewSourceInput(e.target.value)}
                    placeholder="Add custom source (e.g. Billboard, Local Flyer)"
                    className="flex-1 text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddDiscoverySource}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add Option
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  WhatsApp Messaging Cooldown
                </label>
                <select
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(parseInt(e.target.value, 10))}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900"
                >
                  <option value={48}>48 hours between follow-ups</option>
                  <option value={72}>72 hours (Recommended for salons & wellness)</option>
                  <option value={168}>7 days between follow-ups</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Prevents staff from accidentally spamming clients who visit multiple times in a short window.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Actions */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Continue to Step {currentStep + 1} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCompleteSetup}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Complete Setup & Launch Dashboard <CheckCircle2 className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
