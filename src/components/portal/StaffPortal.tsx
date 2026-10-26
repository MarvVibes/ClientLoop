import React, { useState, useEffect } from 'react'
import { Logo } from '../Logo'
import { 
  Building2, 
  Users, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Phone, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  ChevronDown, 
  Lock, 
  Plus, 
  MessageSquare, 
  Sliders, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  Star, 
  Check, 
  X, 
  Smartphone, 
  Calendar, 
  Sparkles, 
  MessageCircle, 
  LayoutGrid, 
  Bell, 
  Crown, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Filter, 
  Eye, 
  RefreshCw,
  Copy 
} from 'lucide-react'
import { store } from '../../lib/services/store'
import { whatsappQueue } from '../../lib/messaging/messageQueue'
import { normalizePhoneNumber } from '../../lib/phone/normalize'
import { Business, Customer, Visit, QuestionnaireToken, Message, WorkspaceRole } from '../../lib/types/database'
import { calculateDashboardMetrics, DateRangePreset } from '../../lib/metrics/dashboardMetrics'
import { exportCustomersCsv, exportVisitsCsv, triggerCsvDownload } from '../../lib/export/csvExport'
import { googleReviewSync } from '../../lib/reviews/googleReviewSync'
import { hasPermission } from '../../lib/auth/roles'
import { buildQuestionnaireUrl } from '../../lib/navigation/urlRouter'
import { ReportsView } from './ReportsView'
import { WhatsAppClickToChatModal } from './WhatsAppClickToChatModal'
import { classifyCustomerSegments, buildCustomerInsightProfile } from '../../lib/customers/segments'
import { isSupabaseConfigured } from '../../lib/supabase/client'

interface StaffPortalProps {
  onOpenCustomerQuestionnaire?: (tokenHash: string) => void
  onBackToLanding?: () => void
}

export const StaffPortal: React.FC<StaffPortalProps> = ({ 
  onOpenCustomerQuestionnaire, 
  onBackToLanding 
}) => {
  const businesses = store.getBusinesses()
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businesses[0]?.id || 'biz_paso_elite')
  const [currentRole, setCurrentRole] = useState<WorkspaceRole>('manager')
  
  // Navigation: Overview, Clients, Visits, WhatsApp Reviews, Executive Reports, Settings
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'visits' | 'reviews' | 'reports' | 'settings'>('overview')
  const [dashboardPreset, setDashboardPreset] = useState<DateRangePreset>('last_30_days')

  // WhatsApp Click-to-Chat Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppTarget, setWhatsAppTarget] = useState<{ customer: Customer; visit: Visit } | null>(null)
  const [clientSegmentFilter, setClientSegmentFilter] = useState<'all' | 'new' | 'returning' | 'frequent' | 'lapsed'>('all')
  const [newDiscoveryOptionInput, setNewDiscoveryOptionInput] = useState('')

  const handleOpenWhatsAppClickToChat = (cust: Customer, vst: Visit) => {
    setWhatsAppTarget({ customer: cust, visit: vst })
    setIsWhatsAppModalOpen(true)
  }

  // Menus & Modals
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [isLogVisitModalOpen, setIsLogVisitModalOpen] = useState(false)
  const [selectedCustomerDossier, setSelectedCustomerDossier] = useState<Customer | null>(null)
  
  // Form State for Log Visit Modal
  const [phoneInput, setPhoneInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [sendQuestionnaire, setSendQuestionnaire] = useState(true)
  const [notes, setNotes] = useState('')
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null)
  const [recentVisitWarning, setRecentVisitWarning] = useState<string | null>(null)
  
  // Modal Success State
  const [lastLoggedVisit, setLastLoggedVisit] = useState<{
    visit: Visit
    isReturning: boolean
    token?: QuestionnaireToken
    customer: Customer
  } | null>(null)

  // Directory Search State & Filters
  const [clientSearch, setClientSearch] = useState('')
  const [clientFilter, setClientFilter] = useState<'all' | 'loyal' | 'first_time'>('all')

  // Visits Ledger Filter
  const [visitFilter, setVisitFilter] = useState<'all' | 'completed'>('all')

  // Export & Settings Notices
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [googleReviewUrlInput, setGoogleReviewUrlInput] = useState<string>('')
  const [settingsNotice, setSettingsNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedTokenUrl, setCopiedTokenUrl] = useState(false)

  // Interactive Spline Chart hover state
  const [activeSplineIndex, setActiveSplineIndex] = useState<number>(6)
  const [activeSourcesHover, setActiveSourcesHover] = useState<string | null>(null)

  // Refresh Trigger
  const [refreshKey, setRefreshKey] = useState(0)

  const currentBusiness = store.getBusinessById(selectedBusinessId) || businesses[0]
  const defaultCountry = currentBusiness.timezone === 'Africa/Lagos' ? '+234' : '+1'

  // Initialize service & settings on business change
  useEffect(() => {
    if (currentBusiness.services.length > 0) {
      setSelectedService(currentBusiness.services[0].name)
    }
    setGoogleReviewUrlInput(currentBusiness.google_review_url || '')
    setPhoneInput('')
    setCustomerName('')
    setMatchedCustomer(null)
    setRecentVisitWarning(null)
    setLastLoggedVisit(null)
    setSettingsNotice(null)
  }, [selectedBusinessId])

  // Live Phone Lookup & Normalization
  useEffect(() => {
    if (!phoneInput.trim()) {
      setMatchedCustomer(null)
      setRecentVisitWarning(null)
      return
    }

    const norm = normalizePhoneNumber(phoneInput, defaultCountry)
    if (norm.isValid) {
      const found = store.findCustomerByPhone(selectedBusinessId, norm.e164)
      if (found) {
        setMatchedCustomer(found)
        if (!customerName && found.name) {
          setCustomerName(found.name)
        }
        const custVisits = store.getCustomerVisits(selectedBusinessId, found.id)
        if (custVisits.length > 0) {
          const lastVisitDate = new Date(custVisits[0].visit_timestamp)
          const diffHours = (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60)
          if (diffHours < 72) {
            setRecentVisitWarning(`Client visited ${Math.round(diffHours)}h ago. 72h WhatsApp cooldown active.`)
          } else {
            setRecentVisitWarning(null)
          }
        }
      } else {
        setMatchedCustomer(null)
        setRecentVisitWarning(null)
      }
    } else {
      setMatchedCustomer(null)
      setRecentVisitWarning(null)
    }
  }, [phoneInput, selectedBusinessId, defaultCountry])

  // Handle Log Visit Form Submission
  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneInput.trim() || !selectedService) return

    try {
      const { customer } = store.createOrUpdateCustomer(selectedBusinessId, {
        phone: phoneInput,
        countryCode: defaultCountry,
        name: customerName.trim() || null,
        notes: notes.trim() || null
      })

      const { visit, isReturningClient, token } = store.recordVisit(selectedBusinessId, {
        customerId: customer.id,
        service: selectedService,
        sendQuestionnaire: sendQuestionnaire && customer.consent_status !== 'opted_out'
      })

      // Send WhatsApp follow-up if allowed
      if (token && customer.consent_status !== 'opted_out') {
        const questionnaireLink = buildQuestionnaireUrl(token.token_hash)
        await whatsappQueue.enqueueMessage({
          businessId: selectedBusinessId,
          customerId: customer.id,
          visitId: visit.id,
          recipientPhone: customer.normalized_phone,
          templateName: 'post_visit_followup_v2',
          parameters: {
            customer_name: customer.name || 'Valued Client',
            business_name: currentBusiness.name,
            secure_form_link: questionnaireLink
          },
          idempotencyKey: `send_${visit.id}`
        })
      }

      setLastLoggedVisit({
        visit,
        isReturning: isReturningClient,
        token,
        customer
      })

      // Reset form
      setPhoneInput('')
      setCustomerName('')
      setNotes('')
      setMatchedCustomer(null)
      setRecentVisitWarning(null)
      setRefreshKey(prev => prev + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record visit'
      alert(msg)
    }
  }

  // Quick Demo Prefills
  const handlePreFillReturning = () => {
    if (selectedBusinessId === 'biz_paso_elite') {
      setPhoneInput('0803 555 0192')
      setCustomerName('Chioma Adebayo')
      setSelectedService('Signature Beard Sculpt & Hot Towel')
    } else if (selectedBusinessId === 'biz_lumina_spa') {
      setPhoneInput('(555) 019-2834')
      setCustomerName('Maya Lin')
      setSelectedService('Custom Hydrafacial & LED Therapy')
    } else {
      setPhoneInput('(555) 018-9942')
      setCustomerName('Dave Miller')
      setSelectedService('Complete Brake & Rotor Service')
    }
  }

  const handlePreFillNew = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    if (defaultCountry === '+234') {
      setPhoneInput(`0802 888 ${randomSuffix}`)
      setCustomerName('Amaka Johnson')
    } else {
      setPhoneInput(`(555) 441-${randomSuffix}`)
      setCustomerName('Sarah Connor')
    }
  }

  // Export handlers
  const handleExportClients = () => {
    try {
      const { filename, csv } = exportCustomersCsv(selectedBusinessId, currentRole)
      triggerCsvDownload(filename, csv)
      setExportNotice(`Exported ${filename} (${customers.length} clients)`)
      setTimeout(() => setExportNotice(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setExportNotice(msg)
      setTimeout(() => setExportNotice(null), 4000)
    }
  }

  const handleExportVisits = () => {
    try {
      const { filename, csv } = exportVisitsCsv(selectedBusinessId, currentRole)
      triggerCsvDownload(filename, csv)
      setExportNotice(`Exported ${filename} (${visits.length} visits)`)
      setTimeout(() => setExportNotice(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setExportNotice(msg)
      setTimeout(() => setExportNotice(null), 4000)
    }
  }

  // Google Review URL Save Handler
  const handleSaveGoogleReviewUrl = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = googleReviewSync.setVerifiedReviewUrl(selectedBusinessId, googleReviewUrlInput.trim())
      if (result.success) {
        setSettingsNotice({ type: 'success', message: 'Google review link verified and saved successfully!' })
        setRefreshKey(prev => prev + 1)
      } else {
        setSettingsNotice({ type: 'error', message: result.error || 'Failed to update Google Review URL' })
      }
      setTimeout(() => setSettingsNotice(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update Google Review URL'
      setSettingsNotice({ type: 'error', message: msg })
    }
  }

  const handleRemoveGoogleReviewUrl = () => {
    try {
      store.updateBusinessSettings(selectedBusinessId, { google_review_url: null })
      setGoogleReviewUrlInput('')
      setSettingsNotice({ type: 'success', message: 'Google review link removed.' })
      setRefreshKey(prev => prev + 1)
      setTimeout(() => setSettingsNotice(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove link'
      setSettingsNotice({ type: 'error', message: msg })
    }
  }

  const handleCopyGoogleReviewUrl = () => {
    if (currentBusiness.google_review_url) {
      navigator.clipboard.writeText(currentBusiness.google_review_url)
      setSettingsNotice({ type: 'success', message: 'Google review URL copied to clipboard!' })
      setTimeout(() => setSettingsNotice(null), 3000)
    }
  }

  // Acquisition Sources Configuration Handlers
  const handleAddDiscoveryOption = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newDiscoveryOptionInput.trim()
    if (!trimmed) return
    const currentOptions = currentBusiness.discovery_source_options || []
    if (currentOptions.includes(trimmed)) {
      setSettingsNotice({ type: 'error', message: `"${trimmed}" is already an acquisition option.` })
      return
    }
    const updated = [...currentOptions, trimmed]
    store.updateBusinessSettings(selectedBusinessId, { discovery_source_options: updated })
    setNewDiscoveryOptionInput('')
    setSettingsNotice({ type: 'success', message: `Added "${trimmed}" to acquisition sources.` })
    setRefreshKey(prev => prev + 1)
    setTimeout(() => setSettingsNotice(null), 4000)
  }

  const handleRemoveDiscoveryOption = (optToRemove: string) => {
    const currentOptions = currentBusiness.discovery_source_options || []
    const updated = currentOptions.filter(o => o !== optToRemove)
    store.updateBusinessSettings(selectedBusinessId, { discovery_source_options: updated })
    setSettingsNotice({ type: 'success', message: `Removed "${optToRemove}".` })
    setRefreshKey(prev => prev + 1)
    setTimeout(() => setSettingsNotice(null), 4000)
  }

  // Data Selectors with correct tenant-scoped store signatures
  const customers: Customer[] = store.getCustomersByBusiness(selectedBusinessId)
  const visits: Visit[] = store.getVisitsByBusiness(selectedBusinessId)
  const queueMessages: Message[] = whatsappQueue.getMessagesByBusiness(selectedBusinessId)
  const dashboardMetrics = calculateDashboardMetrics(selectedBusinessId, { preset: dashboardPreset })
  const canExport = hasPermission(currentRole, 'canExportData')

  // Filtered Clients for Directory
  const filteredClients = customers.filter((c: Customer) => {
    const q = clientSearch.toLowerCase()
    const matchesSearch = (
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.normalized_phone.includes(q) ||
      (c.first_discovery_source && c.first_discovery_source.toLowerCase().includes(q))
    )
    if (!matchesSearch) return false

    const custVisits = store.getCustomerVisits(selectedBusinessId, c.id)
    if (clientSegmentFilter !== 'all') {
      const segs = classifyCustomerSegments(custVisits)
      if (clientSegmentFilter === 'new' && !segs.includes('new')) return false
      if (clientSegmentFilter === 'returning' && !segs.includes('returning')) return false
      if (clientSegmentFilter === 'frequent' && !segs.includes('frequent')) return false
      if (clientSegmentFilter === 'lapsed' && !segs.includes('lapsed')) return false
    }

    if (clientFilter === 'loyal') return custVisits.length > 1
    if (clientFilter === 'first_time') return custVisits.length <= 1
    return true
  })

  // Filtered Visits for Ledger
  const filteredVisits = visits.filter((v: Visit) => {
    if (visitFilter === 'completed') return v.questionnaire_status === 'submitted'
    return true
  })

  // Mock Multi-week retention velocity spline points
  const splineWeeks = [
    { week: 'W1', label: 'Week 1', returning: 14, walkins: 6, date: 'June 07, 2026' },
    { week: 'W2', label: 'Week 2', returning: 22, walkins: 11, date: 'June 14, 2026' },
    { week: 'W3', label: 'Week 3', returning: 18, walkins: 8, date: 'June 21, 2026' },
    { week: 'W4', label: 'Week 4', returning: 26, walkins: 12, date: 'June 28, 2026' },
    { week: 'W5', label: 'Week 5', returning: 31, walkins: 9, date: 'July 05, 2026' },
    { week: 'W6', label: 'Week 6', returning: 28, walkins: 14, date: 'July 12, 2026' },
    { week: 'W7', label: 'Week 7', returning: 37, walkins: 18, date: 'July 19, 2026' },
    { week: 'W8', label: 'Week 8', returning: 42, walkins: 15, date: 'July 26, 2026' },
  ]
  const activeWeekData = splineWeeks[activeSplineIndex] || splineWeeks[6]

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* =========================================================================
          LEFT SIDEBAR (Clean White SaaS Sidebar Matching User's Preferred Layout)
         ========================================================================= */}
      <aside className="w-64 bg-white border-r border-slate-200/80 min-h-screen p-4 flex flex-col justify-between shrink-0 z-30 select-none">
        
        <div>
          {/* Top Logo */}
          <div className="px-2 pt-1 pb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="cursor-pointer focus:outline-none"
            >
              <Logo className="h-7" />
            </button>
          </div>

          {/* Business Location Selector Dropdown */}
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
              className="w-full p-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between text-left cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  {currentBusiness.name.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {currentBusiness.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {currentBusiness.category}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu */}
            {businessDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Switch Business Location
                </div>
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBusinessId(b.id)
                      setBusinessDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                      selectedBusinessId === b.id 
                        ? 'bg-blue-50 text-blue-900 font-bold' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{b.name}</p>
                      <p className="text-[11px] text-slate-500">{b.category} • {b.timezone}</p>
                    </div>
                    {selectedBusinessId === b.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action Button: "+ Log Customer Visit" */}
          <button
            onClick={() => {
              setLastLoggedVisit(null)
              setIsLogVisitModalOpen(true)
            }}
            className="w-full mt-4 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-md shadow-blue-500/20 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Log Customer Visit</span>
          </button>

          {/* Sidebar Navigation Links */}
          <nav className="space-y-1.5 mt-6">
            
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-50/90 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'clients'
                  ? 'bg-blue-50/90 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Clients</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 text-slate-600">
                {customers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('visits')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'visits'
                  ? 'bg-blue-50/90 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <span>Visits</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 text-slate-600">
                {visits.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-blue-50/90 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Reviews</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600">
                {queueMessages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-50/90 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Executive Reports</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                Weekly
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-50/90 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </button>

          </nav>
        </div>

        {/* Bottom Sidebar: User Role & Landing Link */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                {currentRole.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 capitalize">{currentRole} Account</p>
                <p className="text-[10px] text-slate-500">
                  {currentRole === 'owner' ? 'Full Admin' : currentRole === 'manager' ? 'Can Export CSV' : 'Front Desk'}
                </p>
              </div>
            </div>

            {/* Role Switcher */}
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as WorkspaceRole)}
              className="text-[11px] font-bold text-blue-700 bg-transparent cursor-pointer focus:outline-none"
            >
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          {/* Website Link */}
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              <span>← View Public Website</span>
            </button>
          )}

        </div>

      </aside>

      {/* =========================================================================
          RIGHT MAIN CONTENT AREA
         ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Header Bar for Main Content */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          
          {/* Breadcrumb Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 capitalize">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'clients' && 'Client Directory'}
              {activeTab === 'visits' && 'Visits History'}
              {activeTab === 'reviews' && 'WhatsApp Follow-ups & Reviews'}
              {activeTab === 'reports' && 'Executive Performance Reports'}
              {activeTab === 'settings' && 'Business Settings'}
            </h1>
            <span className="text-xs text-slate-300 font-medium hidden sm:inline">•</span>
            {isSupabaseConfigured() ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Supabase Connected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline-block">
                Local Sandbox
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {currentBusiness.name} ({currentBusiness.timezone})
            </span>
          </div>

          {/* Right Header Action Items */}
          <div className="flex items-center gap-3">
            
            {/* Quick Date Range Filter */}
            {activeTab === 'overview' && (
              <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200/60">
                {(['today', 'this_week', 'this_month', 'last_30_days', 'all_time'] as DateRangePreset[]).map((p) => {
                  const labels: Record<DateRangePreset, string> = {
                    today: 'Today',
                    this_week: 'Week',
                    this_month: 'Month',
                    last_30_days: '30 Days',
                    all_time: 'All'
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setDashboardPreset(p)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        dashboardPreset === p 
                          ? 'bg-blue-600 text-white font-bold shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {labels[p]}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Interactive Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors cursor-pointer relative"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                  3
                </span>
              </button>

              {/* Notification Popover Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-xs text-slate-900">Retention Alerts</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        3 New
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    <div 
                      onClick={() => { setActiveTab('visits'); setNotificationsOpen(false) }}
                      className="p-3 rounded-2xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          Visit Completed
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">15m ago</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Chioma Adebayo completed Signature Beard Sculpt & Hot Towel</p>
                    </div>

                    <div 
                      onClick={() => { setActiveTab('reviews'); setNotificationsOpen(false) }}
                      className="p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          5★ Google Review Tapped
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">1h ago</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Marcus Vance tapped outbound Google review link</p>
                    </div>

                    <div 
                      onClick={() => { setActiveTab('settings'); setNotificationsOpen(false) }}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Retention Cooldown Active
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">2h ago</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Emeka Okafor protected under 72h anti-spam window</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                    >
                      Close Drawer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick "+ Log Visit" button in Top Header */}
            <button
              onClick={() => {
                setLastLoggedVisit(null)
                setIsLogVisitModalOpen(true)
              }}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-blue-500/20 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Log Visit</span>
            </button>

          </div>

        </header>

        {/* Global Export Alert Notification */}
        {exportNotice && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-sm flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="font-semibold">{exportNotice}</span>
            </div>
            <button onClick={() => setExportNotice(null)} className="text-blue-700 hover:text-blue-900 font-bold ml-2 cursor-pointer">×</button>
          </div>
        )}

        {/* Main Workspace Canvas */}
        <main className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-8">
          
          {/* =========================================================================
              VIEW 1: OVERVIEW (The Executive Retention Dashboard Matching User Screenshot)
             ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-7 animate-in fade-in duration-150">
              
              {/* Midnight Welcome Banner with Customer Retention & Review Management */}
              <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#1E293B] text-white p-7 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-3 border border-white/15 backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Customer Retention &amp; Review Management</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Welcome, {currentBusiness.name}
                    </h2>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
                      Track client return visits, see which channels bring your best walk-ins, and build authentic Google reviews via WhatsApp.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      onClick={() => {
                        setLastLoggedVisit(null)
                        setIsLogVisitModalOpen(true)
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log Customer Visit</span>
                    </button>

                    {canExport && (
                      <button
                        onClick={handleExportClients}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all border border-white/20 flex items-center gap-2 cursor-pointer backdrop-blur-md active:scale-98"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Core White Metric Cards with Tinted Circular Icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                
                {/* 1: Total Visits */}
                <div 
                  onClick={() => setActiveTab('visits')}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                      Total Visits
                    </span>
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                    {dashboardMetrics.totalVisits}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Logged visits in period</p>
                </div>

                {/* 2: Total Clients */}
                <div 
                  onClick={() => setActiveTab('clients')}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:-translate-y-1 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600 transition-colors">
                      Total Clients
                    </span>
                    <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                    {dashboardMetrics.uniqueCustomers}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {dashboardMetrics.returningCustomers} loyal • {dashboardMetrics.newCustomers} first-time
                  </p>
                </div>

                {/* 3: Repeat Client Rate */}
                <div 
                  onClick={() => {
                    setClientFilter('loyal')
                    setActiveTab('clients')
                  }}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:-translate-y-1 hover:shadow-lg hover:border-emerald-300 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-600 transition-colors">
                      Repeat Client Rate
                    </span>
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-600 mt-2 font-mono">
                    {dashboardMetrics.repeatCustomerRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Returning for 2+ visits</p>
                </div>

                {/* 4: Google Review Clicks */}
                <div 
                  onClick={() => setActiveTab('reviews')}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:-translate-y-1 hover:shadow-lg hover:border-amber-300 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">
                      Google Review Clicks
                    </span>
                    <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Star className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-500 mt-2 font-mono">
                    {dashboardMetrics.reviewLinkClicks}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {dashboardMetrics.questionnairesCompleted} completed feedback forms
                  </p>
                </div>

              </div>

              {/* Two Column Section: Discovery Channels Attribution + Recent Visits */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                
                {/* Discovery Attribution (7 Cols) */}
                <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">How Clients Find Your Business</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Captured from your client questionnaires on WhatsApp.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                      Auto-Attributed
                    </span>
                  </div>

                  {dashboardMetrics.acquisitionSources.length === 0 ? (
                    <div className="space-y-3 py-4">
                      {/* Realistic baseline display when cold */}
                      <div className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Friend or Family Recommendation</span>
                          <span className="font-mono text-slate-500">2 clients (100%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full w-full" />
                        </div>
                      </div>

                      <div className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors opacity-60">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Instagram / Social Media</span>
                          <span className="font-mono text-slate-500">0 clients (0%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-slate-200 h-full rounded-full w-0" />
                        </div>
                      </div>

                      <div className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors opacity-60">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Google Search / Maps</span>
                          <span className="font-mono text-slate-500">0 clients (0%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-slate-200 h-full rounded-full w-0" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dashboardMetrics.acquisitionSources.map((item, idx) => (
                        <div 
                          key={idx} 
                          onMouseEnter={() => setActiveSourcesHover(item.source)}
                          onMouseLeave={() => setActiveSourcesHover(null)}
                          className={`p-3 rounded-2xl transition-all ${
                            activeSourcesHover === item.source ? 'bg-blue-50/70 shadow-xs' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              {item.source}
                            </span>
                            <span className="font-mono text-slate-500 font-bold">
                              {item.count} client{item.count !== 1 ? 's' : ''} ({item.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                            <div 
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(item.percentage, 4)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive Weekly Retention Momentum Chart inside Overview */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900">Weekly Retention Velocity</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Hover week to inspect
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                      {/* Interactive Week Pills */}
                      <div className="flex items-center justify-between gap-1 mb-3">
                        {splineWeeks.map((sw, idx) => (
                          <button
                            key={sw.week}
                            onClick={() => setActiveSplineIndex(idx)}
                            onMouseEnter={() => setActiveSplineIndex(idx)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              activeSplineIndex === idx
                                ? 'bg-blue-600 text-white shadow-xs scale-105'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            {sw.week}
                          </button>
                        ))}
                      </div>

                      {/* Active Week Stat Card */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{activeWeekData.date}</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{activeWeekData.label} Retention Summary</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-indigo-600 font-bold">● {activeWeekData.returning} Returning</span>
                          <span className="text-emerald-600 font-bold">● {activeWeekData.walkins} Walk-ins</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Recent Visits (5 Cols) */}
                <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-900">Recent Visits</h3>
                    <button
                      onClick={() => setActiveTab('visits')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer group"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {visits.slice(0, 5).map((v: Visit) => {
                      const cust = store.findCustomerById(selectedBusinessId, v.customer_id)
                      const isFeedback = v.questionnaire_status === 'submitted'
                      const initials = cust?.name 
                        ? cust.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : 'CL'

                      return (
                        <div 
                          key={v.id} 
                          onClick={() => cust && setSelectedCustomerDossier(cust)}
                          className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {initials}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                {cust?.name || 'Walk-in Client'}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                {v.service}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFeedback 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                : 'bg-slate-200/70 text-slate-600'
                            }`}>
                              {isFeedback ? 'Feedback Received' : 'Follow-up Sent'}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setLastLoggedVisit(null)
                        setIsLogVisitModalOpen(true)
                      }}
                      className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Log New Client Visit</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =========================================================================
              VIEW 2: CLIENTS (Full-Featured CRM Directory)
             ========================================================================= */}
          {activeTab === 'clients' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Mini KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Directory</span>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">{customers.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loyal Returners (2+)</span>
                  <p className="text-2xl font-black text-indigo-600 font-mono mt-1">
                    {customers.filter((c: Customer) => store.getCustomerVisits(selectedBusinessId, c.id).length > 1).length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">First-Time Clients</span>
                  <p className="text-2xl font-black text-blue-600 font-mono mt-1">
                    {customers.filter((c: Customer) => store.getCustomerVisits(selectedBusinessId, c.id).length <= 1).length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Opted-In</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                    {customers.filter((c: Customer) => c.consent_status !== 'opted_out').length}
                  </p>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                
                {/* Search Bar */}
                <div className="relative min-w-[280px] flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by client name, phone number, or discovery..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills with Segment Support */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                  <button
                    onClick={() => { setClientFilter('all'); setClientSegmentFilter('all') }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      clientSegmentFilter === 'all' && clientFilter === 'all' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({customers.length})
                  </button>
                  <button
                    onClick={() => { setClientSegmentFilter('new'); setClientFilter('all') }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      clientSegmentFilter === 'new' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    New (30d)
                  </button>
                  <button
                    onClick={() => { setClientSegmentFilter('returning'); setClientFilter('all') }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      clientSegmentFilter === 'returning' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Returning (2+)
                  </button>
                  <button
                    onClick={() => { setClientSegmentFilter('frequent'); setClientFilter('all') }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      clientSegmentFilter === 'frequent' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Frequent (3+)
                  </button>
                  <button
                    onClick={() => { setClientSegmentFilter('lapsed'); setClientFilter('all') }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      clientSegmentFilter === 'lapsed' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Lapsed (45d+)
                  </button>
                </div>

                {/* Export Button */}
                {canExport && (
                  <button
                    onClick={handleExportClients}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Export CSV</span>
                  </button>
                )}

              </div>

              {/* Clients Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-5">Client Name &amp; Phone</th>
                        <th className="py-3.5 px-5">Loyalty &amp; Segment</th>
                        <th className="py-3.5 px-5">Discovery Source</th>
                        <th className="py-3.5 px-5">WhatsApp Opt-in</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                            No clients match your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((c: Customer) => {
                          const custVisits = store.getCustomerVisits(selectedBusinessId, c.id)
                          const segs = classifyCustomerSegments(custVisits)
                          const isLoyal = custVisits.length > 1
                          const initials = c.name 
                            ? c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            : 'CL'

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs">
                                      {c.name || 'Unnamed Client'}
                                    </p>
                                    <p className="text-[11px] font-mono text-slate-500">
                                      {c.normalized_phone}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                                    isLoyal ? 'bg-purple-50 text-purple-700 border border-purple-200/80' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {isLoyal && <Crown className="w-3 h-3 text-amber-500" />}
                                    {custVisits.length} visit{custVisits.length !== 1 ? 's' : ''}
                                  </span>

                                  {segs.includes('frequent') && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                      VIP
                                    </span>
                                  )}
                                  {segs.includes('lapsed') && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                      Lapsed
                                    </span>
                                  )}
                                  {segs.includes('new') && !segs.includes('frequent') && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                      New
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-4 px-5 text-slate-700 font-medium">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                                  {c.first_discovery_source || 'Friend or Family'}
                                </span>
                              </td>

                              <td className="py-4 px-5">
                                {c.consent_status === 'opted_out' ? (
                                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                                    • Opted Out
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active (Opted-in)
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-5 text-right space-x-1.5">
                                {custVisits.length > 0 && (
                                  <button
                                    onClick={() => handleOpenWhatsAppClickToChat(c, custVisits[0])}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title="Open WhatsApp Click-to-Chat"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedCustomerDossier(c)}
                                  className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                                >
                                  View Dossier →
                                </button>
                                <button
                                  onClick={() => {
                                    setPhoneInput(c.normalized_phone)
                                    setCustomerName(c.name || '')
                                    setIsLogVisitModalOpen(true)
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                >
                                  + Log
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              VIEW 3: VISITS (Complete Chronological Ledger)
             ========================================================================= */}
          {activeTab === 'visits' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Mini KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Visits</span>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">{visits.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feedback Recv</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                    {visits.filter((v: Visit) => v.questionnaire_status === 'submitted').length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow-ups Sent</span>
                  <p className="text-2xl font-black text-blue-600 font-mono mt-1">
                    {visits.filter((v: Visit) => v.questionnaire_status === 'sent' || v.questionnaire_status === 'submitted').length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</span>
                  <p className="text-2xl font-black text-amber-500 font-mono mt-1">
                    {visits.length > 0 
                      ? Math.round((visits.filter((v: Visit) => v.questionnaire_status === 'submitted').length / visits.length) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Visits Ledger &amp; Check-ins
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time chronological timeline of client check-ins and feedback status.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setVisitFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        visitFilter === 'all' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({visits.length})
                    </button>
                    <button
                      onClick={() => setVisitFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        visitFilter === 'completed' ? 'bg-white text-emerald-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Feedback Received
                    </button>
                  </div>

                  {canExport && (
                    <button
                      onClick={handleExportVisits}
                      className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Visits Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-5">Client Name &amp; Phone</th>
                        <th className="py-3.5 px-5">Service Rendered</th>
                        <th className="py-3.5 px-5">WhatsApp Follow-up</th>
                        <th className="py-3.5 px-5">Timestamp (Lagos)</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVisits.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                            No visits recorded.
                          </td>
                        </tr>
                      ) : (
                        filteredVisits.map((v: Visit) => {
                          const cust = store.findCustomerById(selectedBusinessId, v.customer_id)
                          const initials = cust?.name 
                            ? cust.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            : 'CL'

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs">{cust?.name || 'Walk-in Client'}</p>
                                    <p className="text-[11px] font-mono text-slate-500">{cust?.normalized_phone}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-5">
                                <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/70 font-semibold text-xs">
                                  {v.service}
                                </span>
                              </td>

                              <td className="py-4 px-5">
                                {v.questionnaire_status === 'submitted' && (
                                  <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Feedback Received
                                  </span>
                                )}
                                {v.questionnaire_status === 'sent' && (
                                  <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-medium text-xs">
                                    Follow-up Delivered
                                  </span>
                                )}
                                {v.questionnaire_status === 'none' && (
                                  <span className="text-slate-400 text-xs italic">No follow-up sent</span>
                                )}
                              </td>

                              <td className="py-4 px-5 font-mono text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {new Date(v.visit_timestamp).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}
                                </span>
                              </td>

                              <td className="py-4 px-5 text-right space-x-1.5">
                                {cust && (
                                  <button
                                    onClick={() => handleOpenWhatsAppClickToChat(cust, v)}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title="Open WhatsApp Click-to-Chat"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => cust && setSelectedCustomerDossier(cust)}
                                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                >
                                  View Dossier →
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              VIEW 4: WHATSAPP REVIEWS (Queue, Cloud Engine & Review Funnel)
             ========================================================================= */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Meta Cloud Status Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white rounded-3xl border border-emerald-800/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Meta Cloud WhatsApp Engine</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        OPERATIONAL
                      </span>
                    </div>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Webhook Latency: 42ms • Rate-limit Guard: 0 drops • 72-hr Cooldown Active
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPhoneInput('0803 555 0192')
                    setCustomerName('Chioma Adebayo')
                    setIsLogVisitModalOpen(true)
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  + Trigger Test Check-in
                </button>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Follow-ups Dispatched</span>
                  <div className="text-3xl font-black text-slate-900 mt-2 font-mono">{queueMessages.length}</div>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Automated 30s trigger</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Client Read Rate</span>
                  <div className="text-3xl font-black text-blue-600 mt-2 font-mono">88%</div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Verified blue tick (✓✓)</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">5★ Google Reviews</span>
                  <div className="text-3xl font-black text-amber-500 mt-2 font-mono">93</div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Outbound review link clicks</p>
                </div>
              </div>

              {/* Queue Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">WhatsApp Client Follow-up Ledger</h3>
                  <span className="text-xs font-mono text-slate-400">{queueMessages.length} Messages in Ledger</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-5">Recipient Client</th>
                        <th className="py-3.5 px-5">Message Purpose</th>
                        <th className="py-3.5 px-5">Delivery Status</th>
                        <th className="py-3.5 px-5">Sent Time</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {queueMessages.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                            No follow-up messages sent yet. Log a visit to automatically trigger post-appointment follow-up.
                          </td>
                        </tr>
                      ) : (
                        queueMessages.map((msg: Message) => {
                          const cust = store.findCustomerById(selectedBusinessId, msg.customer_id)
                          return (
                            <tr key={msg.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-5">
                                <p className="font-bold text-slate-900 text-xs">{cust?.name || 'Client'}</p>
                                <p className="text-[11px] font-mono text-slate-500">{cust?.normalized_phone}</p>
                              </td>
                              <td className="py-4 px-5 text-slate-600 font-medium">
                                Post-Visit Feedback &amp; Review Invitation
                              </td>
                              <td className="py-4 px-5">
                                {msg.status === 'read' && (
                                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                                    ✓✓ Read by Client
                                  </span>
                                )}
                                {msg.status === 'delivered' && (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                    ✓ Delivered
                                  </span>
                                )}
                                {msg.status === 'queued' && (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                                    Queued
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 font-mono text-xs text-slate-500">
                                {new Date(msg.created_at).toLocaleTimeString()}
                              </td>
                              <td className="py-4 px-5 text-right">
                                {msg.provider_message_id && msg.status === 'delivered' ? (
                                  <button
                                    onClick={() => {
                                      whatsappQueue.simulateReadStatus(msg.provider_message_id!)
                                      setRefreshKey(prev => prev + 1)
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors"
                                  >
                                    Mark as Read ✓✓
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 font-mono">Synced</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              VIEW 5: EXECUTIVE REPORTS (Weekly & Monthly Performance & Insights)
             ========================================================================= */}
          {activeTab === 'reports' && (
            <ReportsView business={currentBusiness} />
          )}

          {/* =========================================================================
              VIEW 6: SETTINGS (Google Review Management & Acquisition Sources)
             ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-150">
              
              {/* Left Column: Review Management & Acquisition Sources */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Google Review Management Card */}
                <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        Google Review Management
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure the Google Maps review link shown to clients on the feedback thank-you page
                      </p>
                    </div>
                    {currentBusiness.google_review_url ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Configured &amp; Verified
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Not Configured
                      </span>
                    )}
                  </div>

                  {settingsNotice && (
                    <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
                      settingsNotice.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      <span>{settingsNotice.message}</span>
                      <button onClick={() => setSettingsNotice(null)} className="font-bold ml-2 cursor-pointer">×</button>
                    </div>
                  )}

                  <form onSubmit={handleSaveGoogleReviewUrl} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Official Google Review URL (HTTPS):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={googleReviewUrlInput}
                          onChange={(e) => setGoogleReviewUrlInput(e.target.value)}
                          placeholder="https://maps.google.com/?cid=... or https://g.page/r/..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <button
                          type="submit"
                          disabled={currentRole === 'staff'}
                          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            currentRole !== 'staff'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          Save Link
                        </button>
                      </div>

                      {/* Official Google Guide & Safe Policy note */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Safe hostnames: maps.google.com, g.page, search.google.com, goo.gl</span>
                        <a
                          href="https://support.google.com/business/answer/3474122"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-bold shrink-0 ml-2"
                        >
                          <span>Official Google Guide</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Action Bar for Configured Review Link */}
                    {currentBusiness.google_review_url && (
                      <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
                        <a
                          href={currentBusiness.google_review_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Test Review Link in New Tab</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleCopyGoogleReviewUrl}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Link</span>
                        </button>

                        {currentRole !== 'staff' && (
                          <button
                            type="button"
                            onClick={handleRemoveGoogleReviewUrl}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Remove URL</span>
                          </button>
                        )}
                      </div>
                    )}
                  </form>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Policy-Compliant Review Management:</p>
                    <p className="text-[11px] leading-relaxed">
                      ClientLoop displays the exact same optional Google review invitation to all customers on their thank-you screen, regardless of rating or sentiment. We never gate reviews, filter negative responses, or auto-submit ratings.
                    </p>
                  </div>
                </div>

                {/* 2. Customer Acquisition Sources Management */}
                <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-blue-600" />
                        Customer Discovery &amp; Acquisition Sources
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Options presented to customers in question: &ldquo;How did you first hear about us?&rdquo;
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {(currentBusiness.discovery_source_options || []).length} options
                    </span>
                  </div>

                  {/* Active Source Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(currentBusiness.discovery_source_options || []).map((source) => (
                      <span
                        key={source}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200/80"
                      >
                        <span>{source}</span>
                        {currentRole !== 'staff' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDiscoveryOption(source)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-0.5"
                            title={`Remove ${source}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Add New Source Input */}
                  {currentRole !== 'staff' && (
                    <form onSubmit={handleAddDiscoveryOption} className="pt-2 flex gap-2">
                      <input
                        type="text"
                        value={newDiscoveryOptionInput}
                        onChange={(e) => setNewDiscoveryOptionInput(e.target.value)}
                        placeholder="Add new source (e.g. Radio Ad, Billboards, Event)..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        + Add Source
                      </button>
                    </form>
                  )}
                </div>

                {/* 3. Spam Protection & Privacy Guard */}
                <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Spam Protection &amp; Cooldown Guard</h4>
                      <p className="text-xs text-slate-500">Protects regular clients from excessive messaging</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <span className="font-bold text-slate-800 block">72-Hour Cooldown</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                        Clients visited within 3 days will not receive duplicate review requests.
                      </span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <span className="font-bold text-slate-800 block">1-Tap Opt-Out Compliance</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                        Clients can reply STOP on WhatsApp to cease all communications immediately.
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Customer Thank-You Page & Review Journey Preview */}
              <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-xs text-slate-900">Customer Review Journey Preview</h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                    Zero-Gating
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  This preview shows the exact thank-you screen your customers see after submitting feedback.
                </p>

                {/* Smartphone Canvas */}
                <div className="max-w-[320px] mx-auto rounded-[38px] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800 text-slate-900">
                  <div className="w-20 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                  </div>

                  <div className="bg-white rounded-[26px] overflow-hidden min-h-[460px] flex flex-col justify-between text-xs border border-slate-200">
                    
                    {/* Header */}
                    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-[10px]">
                          {currentBusiness.name.charAt(0)}
                        </div>
                        <span className="font-bold text-xs truncate max-w-[170px]">{currentBusiness.name}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>

                    {/* Thank You Body */}
                    <div className="p-5 text-center space-y-4 my-auto">
                      <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-900">Thank You!</h4>
                        <p className="text-xs text-slate-500">
                          Your feedback has been saved securely with {currentBusiness.name}.
                        </p>
                      </div>

                      {/* Neutral Review Invitation */}
                      {currentBusiness.google_review_url ? (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                          <p className="text-[11px] text-slate-700 leading-relaxed">
                            Thank you for sharing your feedback. We appreciate your time. If you&rsquo;d like to share your experience with others, you can leave us an honest review on Google.
                          </p>
                          <a
                            href={currentBusiness.google_review_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-white text-white" />
                            <span>Leave a Google Review</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <p className="text-[10px] text-slate-400 text-center">
                            Optional • Opens in Google Maps
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800">
                          <p className="font-bold">Google Review Link Not Set</p>
                          <p className="text-[10px] text-amber-700 mt-0.5">
                            Configure your link on the left to show the review button here.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400">
                        ClientLoop Intelligence &bull; Verified Tenant
                      </span>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </main>

      </div>

      {/* =========================================================================
          MODAL 1: LOG CUSTOMER VISIT (Capped at 92vh with Fixed Header and Footer)
         ========================================================================= */}
      {isLogVisitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Pinned Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Quick Check-In</span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Log a Customer Visit
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save customer appointment and send an automatic WhatsApp follow-up.
                </p>
              </div>
              <button
                onClick={() => setIsLogVisitModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Quick Demo Pre-fill helper */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <span className="text-slate-600 font-semibold">Test with sample data:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreFillReturning}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold cursor-pointer transition-colors"
                  >
                    Fill Returning Client
                  </button>
                  <button
                    type="button"
                    onClick={handlePreFillNew}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer transition-colors"
                  >
                    Fill New Client
                  </button>
                </div>
              </div>

              {/* Success Card when Visit is Logged */}
              {lastLoggedVisit ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-base text-emerald-900">
                        Visit Recorded for {lastLoggedVisit.customer.name || 'Client'}!
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Service: {lastLoggedVisit.visit.service} • {lastLoggedVisit.isReturning ? 'Returning Client' : 'First-time Walk-in'}
                      </p>
                    </div>
                  </div>

                  {lastLoggedVisit.token && (
                    <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        WhatsApp message queued with secure single-use link:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={buildQuestionnaireUrl(lastLoggedVisit.token.token_hash)}
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const url = buildQuestionnaireUrl(lastLoggedVisit.token!.token_hash)
                            navigator.clipboard?.writeText(url)
                            setCopiedTokenUrl(true)
                            setTimeout(() => setCopiedTokenUrl(false), 2000)
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                          title="Copy Link to Clipboard"
                        >
                          {copiedTokenUrl ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-600" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogVisitModalOpen(false)
                          if (onOpenCustomerQuestionnaire && lastLoggedVisit.token) {
                            onOpenCustomerQuestionnaire(lastLoggedVisit.token.token_hash)
                          }
                        }}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Customer Questionnaire Preview →</span>
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setLastLoggedVisit(null)}
                      className="px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Log Another Visit
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLogVisitModalOpen(false)}
                      className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form id="logVisitForm" onSubmit={handleSaveVisit} className="space-y-4">
                  
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Customer WhatsApp Phone Number *
                    </label>
                    <div className="flex gap-2">
                      <span className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center">
                        {defaultCountry}
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={defaultCountry === '+234' ? '0803 123 4567' : '(555) 019-2834'}
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    {matchedCustomer && (
                      <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Returning Client: <strong>{matchedCustomer.name || 'Unnamed'}</strong> ({store.getCustomerVisits(selectedBusinessId, matchedCustomer.id).length} previous visits).
                        </span>
                      </div>
                    )}

                    {recentVisitWarning && (
                      <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{recentVisitWarning}</span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Customer Name (Optional for first-time walk-in)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chioma Adebayo"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {/* Service */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Service Rendered *
                    </label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                    >
                      {currentBusiness.services.map((srv) => (
                        <option key={srv.id} value={srv.name}>
                          {srv.name} {srv.default_price ? `(${currentBusiness.timezone === 'Africa/Lagos' ? '₦' : '$'}${srv.default_price.toLocaleString()})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Staff Private Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Private Staff Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Regular stylist, prefers extra conditioner"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Send Follow-Up Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={sendQuestionnaire}
                        onChange={(e) => setSendQuestionnaire(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Send WhatsApp Follow-up &amp; Review Link
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                          Customer will receive a friendly 30-second feedback link on WhatsApp.
                        </span>
                      </div>
                    </label>
                  </div>

                </form>
              )}

            </div>

            {/* Pinned Modal Footer */}
            {!lastLoggedVisit && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLogVisitModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="logVisitForm"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-blue-500/20 active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Visit &amp; Send Message</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CUSTOMER PROFILE DOSSIER (Capped at 92vh with Fixed Header and Footer)
         ========================================================================= */}
      {selectedCustomerDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Client Profile</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedCustomerDossier.name || 'Unnamed Client'}
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {selectedCustomerDossier.normalized_phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerDossier(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            {(() => {
              const dossierVisits = store.getCustomerVisits(selectedBusinessId, selectedCustomerDossier.id)
              const dossierSubmissions = store.getSubmissionsByBusiness(selectedBusinessId).filter(s => s.customer_id === selectedCustomerDossier.id)
              const dossierProfile = buildCustomerInsightProfile(selectedCustomerDossier, dossierVisits, dossierSubmissions)

              return (
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  
                  {/* Segment Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Segments:
                    </span>
                    {dossierProfile.segments.includes('frequent') && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                        ★ VIP Frequent Client (3+ Visits)
                      </span>
                    )}
                    {dossierProfile.segments.includes('lapsed') && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                        ⚠️ Lapsed (45+ Days Since Visit)
                      </span>
                    )}
                    {dossierProfile.segments.includes('new') && !dossierProfile.segments.includes('frequent') && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                        🌱 New Customer
                      </span>
                    )}
                    {dossierProfile.segments.includes('returning') && !dossierProfile.segments.includes('frequent') && (
                      <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold">
                        🔄 Returning Customer
                      </span>
                    )}
                  </div>

                  {/* Discrepancy Alert */}
                  {dossierProfile.hasSelfReportDiscrepancy && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Self-Reported First Visit Discrepancy</p>
                        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                          Customer stated &ldquo;Yes, this is my first visit&rdquo; on feedback form, but {dossierVisits.length} prior visits exist in the database. Customer&rsquo;s response is preserved as submitted.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Metric Summary */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Visits</span>
                      <p className="text-xl font-black text-slate-900 font-mono mt-1">
                        {dossierVisits.length}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discovery Source</span>
                      <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                        {selectedCustomerDossier.first_discovery_source || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Questionnaire Feedback History */}
                  {dossierSubmissions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        Submitted Feedback &amp; Ratings ({dossierSubmissions.length})
                      </h4>
                      <div className="space-y-2">
                        {dossierSubmissions.map((sub) => (
                          <div key={sub.id} className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{sub.service_answer || 'General Service'}</span>
                              {sub.rating && (
                                <span className="flex items-center gap-1 text-amber-600 font-bold font-mono">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                  {sub.rating}/5
                                </span>
                              )}
                            </div>
                            {sub.feedback_text && (
                              <p className="text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100 text-[11px]">
                                &ldquo;{sub.feedback_text}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Source: {sub.discovery_source_answer || 'Unspecified'}</span>
                              <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visit History Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Visit History Timeline
                    </h4>
                    <div className="space-y-2">
                      {dossierVisits.map((v: Visit) => (
                        <div key={v.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 block">{v.service}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(v.visit_timestamp).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            v.questionnaire_status === 'submitted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200/70 text-slate-600'
                          }`}>
                            {v.questionnaire_status === 'submitted' ? '✓ Feedback Received' : 'Follow-up Sent'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )
            })()}

            {/* Pinned Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              {(() => {
                const visitsForChat = store.getCustomerVisits(selectedBusinessId, selectedCustomerDossier.id)
                return visitsForChat.length > 0 ? (
                  <button
                    onClick={() => {
                      const latestV = visitsForChat[0]
                      const cust = selectedCustomerDossier
                      setSelectedCustomerDossier(null)
                      handleOpenWhatsAppClickToChat(cust, latestV)
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    title="Open manual WhatsApp click-to-chat modal"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Chat</span>
                  </button>
                ) : <div />
              })()}

              <button
                onClick={() => {
                  setPhoneInput(selectedCustomerDossier.normalized_phone)
                  setCustomerName(selectedCustomerDossier.name || '')
                  setSelectedCustomerDossier(null)
                  setIsLogVisitModalOpen(true)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Log New Visit for this Client →
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: MANUAL WHATSAPP CLICK-TO-CHAT DISPATCHER
         ========================================================================= */}
      {isWhatsAppModalOpen && whatsAppTarget && (
        <WhatsAppClickToChatModal
          isOpen={isWhatsAppModalOpen}
          business={currentBusiness}
          customer={whatsAppTarget.customer}
          visit={whatsAppTarget.visit}
          onClose={() => {
            setIsWhatsAppModalOpen(false)
            setWhatsAppTarget(null)
          }}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1)
          }}
        />
      )}

    </div>
  )
}
