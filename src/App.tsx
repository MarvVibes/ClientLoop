import React, { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { InteractiveProductPreview } from './components/InteractiveProductPreview'
import { ValueComparison } from './components/ValueComparison'
import { HowItWorks } from './components/HowItWorks'
import { FeaturesBento } from './components/FeaturesBento'
import { UseCaseSwitcher } from './components/UseCaseSwitcher'
import { CustomerJourney } from './components/CustomerJourney'
import { TrustAndEthics } from './components/TrustAndEthics'
import { PricingSection } from './components/PricingSection'
import { FAQSection } from './components/FAQSection'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'
import { StaffPortal } from './components/portal/StaffPortal'
import { PublicQuestionnairePage } from './components/portal/PublicQuestionnairePage'
import { AuthModal } from './components/auth/AuthModal'
import { BusinessOnboarding } from './components/onboarding/BusinessOnboarding'
import { AuthProvider, useAuth } from './lib/auth/AuthContext'
import { 
  EarlyAccessModal, 
  PrivacyModal, 
  TermsModal, 
  ContactModal 
} from './components/ModalsCollection'
import { parseRoute, updateBrowserUrl, AppView } from './lib/navigation/urlRouter'
import { Lock, ArrowRight, ShieldCheck, ArrowLeft, Building2 } from 'lucide-react'

function AppContent() {
  const { user, isAuthenticated, hasCompletedOnboarding, activeBusiness, signOut, refreshActiveBusiness } = useAuth()

  // Navigation / View state - Initialized from URL directly (?token=..., /f/..., /portal)
  const [initialRoute] = useState(() => parseRoute())
  const [currentView, setCurrentView] = useState<AppView>(initialRoute.view)
  const [activeQuestionnaireToken, setActiveQuestionnaireToken] = useState<string>(initialRoute.token || '')
  const [isCreatingNewBusiness, setIsCreatingNewBusiness] = useState(false)

  // Sync with browser back/forward and hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      const route = parseRoute()
      setCurrentView(route.view)
      if (route.token) {
        setActiveQuestionnaireToken(route.token)
      }
    }

    window.addEventListener('popstate', handleUrlChange)
    window.addEventListener('hashchange', handleUrlChange)
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
      window.removeEventListener('hashchange', handleUrlChange)
    }
  }, [])

  // Modal states
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false)
  const [selectedPlanForModal, setSelectedPlanForModal] = useState('Growth')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const handleOpenEarlyAccess = (_planName = 'Free') => {
    // All plans are free — open signup directly
    handleOpenSignUp()
  }

  const handleOpenSignIn = () => {
    setAuthModalMode('signin')
    setAuthModalOpen(true)
  }

  const handleOpenSignUp = () => {
    setAuthModalMode('signup')
    setAuthModalOpen(true)
  }

  const handleExploreProduct = () => {
    const elem = document.querySelector('#product-preview')
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleOpenCustomerQuestionnaire = (tokenHash: string) => {
    setActiveQuestionnaireToken(tokenHash)
    setCurrentView('questionnaire')
    updateBrowserUrl('questionnaire', tokenHash)
  }

  const handleOpenDashboard = () => {
    setCurrentView('staff_portal')
    updateBrowserUrl('staff_portal')
  }

  const handleBackToLanding = () => {
    setCurrentView('landing')
    updateBrowserUrl('landing')
  }

  const handleCloseQuestionnaire = () => {
    if (window.history.state?.view === 'staff_portal') {
      handleOpenDashboard()
    } else {
      handleBackToLanding()
    }
  }

  // 1. View: Public Mobile Questionnaire
  if (currentView === 'questionnaire') {
    return (
      <PublicQuestionnairePage 
        tokenHash={activeQuestionnaireToken}
        onClose={handleCloseQuestionnaire}
      />
    )
  }

  // 2. View: Staff Operations Portal (Protected Route)
  if (currentView === 'staff_portal') {
    // A. Unauthenticated Gate
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-white p-6 sm:p-12 font-sans">
          <div className="max-w-md mx-auto my-auto w-full bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Protected Workspace</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Client records, WhatsApp follow-ups, and executive reports require an authenticated staff account.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleOpenSignIn}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                Sign In to Your Workspace <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleOpenSignUp}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
              >
                Create New Business Account
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <button
                onClick={handleBackToLanding}
                className="hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to website
              </button>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> RLS Isolated
              </span>
            </div>
          </div>

          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode={authModalMode}
            onSuccess={handleOpenDashboard}
          />
        </div>
      )
    }

    // B. Authenticated User with No Business Profile -> Business Onboarding
    if (!hasCompletedOnboarding || isCreatingNewBusiness) {
      return (
        <BusinessOnboarding
          onComplete={async (newBiz) => {
            setIsCreatingNewBusiness(false)
            await refreshActiveBusiness()
          }}
          onSignOut={async () => {
            await signOut()
            handleBackToLanding()
          }}
        />
      )
    }

    // C. Authenticated Workspace Portal
    return (
      <StaffPortal 
        business={activeBusiness}
        onOpenCustomerQuestionnaire={handleOpenCustomerQuestionnaire}
        onBackToLanding={handleBackToLanding}
        onSignOut={async () => {
          await signOut()
          handleBackToLanding()
        }}
        onOpenOnboarding={() => setIsCreatingNewBusiness(true)}
      />
    )
  }

  // 3. View: Marketing Landing Page
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] font-sans antialiased flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Refined Sticky Header with Staff Portal Entry */}
      <Navbar 
        onOpenSignIn={handleOpenSignIn}
        onOpenEarlyAccess={handleOpenSignUp}
      />

      {/* Main Page Content */}
      <main className="flex-1">

        {/* 1. Hero with Interactive Product Mockup Centerpiece */}
        <Hero 
          onOpenEarlyAccess={handleOpenSignUp}
          onExploreProduct={handleExploreProduct}
        />

        {/* 2. The Product Deep-Dive Tabs */}
        <InteractiveProductPreview />

        {/* 3. The Gap (Before vs With ClientLoop) */}
        <ValueComparison />

        {/* 4. How It Works (Three Steps, One Loop) */}
        <HowItWorks />

        {/* 5. Product Features Bento */}
        <FeaturesBento />

        {/* 6. Use-Case Switcher (Configured for Your Trade) */}
        <UseCaseSwitcher />

        {/* 7. Customer Journey (Honestly Measured) */}
        <CustomerJourney />

        {/* 8. Product Principles (Built to be Trusted) */}
        <TrustAndEthics />

        {/* 9. Pricing — Free for everyone */}
        <PricingSection 
          onSelectPlan={(_plan) => handleOpenSignUp()}
        />

        {/* 10. FAQ Accordion */}
        <FAQSection />

        {/* 11. Final Call-to-Action */}
        <FinalCTA onGetStarted={handleOpenSignUp} />

      </main>

      {/* 13. Footer */}
      <Footer 
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onOpenTerms={() => setTermsOpen(true)}
        onOpenContact={() => setContactOpen(true)}
        onOpenEarlyAccess={() => handleOpenEarlyAccess('Growth')}
        onOpenSignIn={handleOpenSignIn}
        onOpenDashboard={handleOpenDashboard}
      />

      {/* Interactive Modals */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={handleOpenDashboard}
      />

      <EarlyAccessModal 
        isOpen={earlyAccessOpen}
        onClose={() => setEarlyAccessOpen(false)}
        initialPlan={selectedPlanForModal}
      />

      <PrivacyModal 
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />

      <TermsModal 
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
      />

      <ContactModal 
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
      />

    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
