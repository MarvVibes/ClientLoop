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
import { 
  SignInModal, 
  EarlyAccessModal, 
  PrivacyModal, 
  TermsModal, 
  ContactModal 
} from './components/ModalsCollection'
import { parseRoute, updateBrowserUrl, AppView } from './lib/navigation/urlRouter'

export function App() {
  // Navigation / View state - Initialized from URL directly (?token=..., /f/..., /portal)
  const [initialRoute] = useState(() => parseRoute())
  const [currentView, setCurrentView] = useState<AppView>(initialRoute.view)
  const [activeQuestionnaireToken, setActiveQuestionnaireToken] = useState<string>(initialRoute.token || '')

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
  const [signInOpen, setSignInOpen] = useState(false)
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false)
  const [selectedPlanForModal, setSelectedPlanForModal] = useState('Growth')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const handleOpenEarlyAccess = (planName = 'Growth') => {
    setSelectedPlanForModal(planName)
    setEarlyAccessOpen(true)
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

  // View: Public Mobile Questionnaire
  if (currentView === 'questionnaire') {
    return (
      <PublicQuestionnairePage 
        tokenHash={activeQuestionnaireToken}
        onClose={handleCloseQuestionnaire}
      />
    )
  }

  // View: Staff Operations Portal (Phase 3 & 4)
  if (currentView === 'staff_portal') {
    return (
      <StaffPortal 
        onOpenCustomerQuestionnaire={handleOpenCustomerQuestionnaire}
        onBackToLanding={handleBackToLanding}
      />
    )
  }

  // View: Marketing Landing Page
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] font-sans antialiased flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Refined Sticky Header with Staff Portal Entry */}
      <Navbar 
        onOpenSignIn={() => setSignInOpen(true)}
        onOpenEarlyAccess={() => handleOpenEarlyAccess('Growth')}
        onOpenDashboard={handleOpenDashboard}
      />

      {/* Main Page Content */}
      <main className="flex-1">

        {/* 1. Hero with Interactive Product Mockup Centerpiece */}
        <Hero 
          onOpenEarlyAccess={() => handleOpenEarlyAccess('Growth')}
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

        {/* 9. Pricing & Early Access Tiers */}
        <PricingSection 
          onSelectPlan={(plan) => handleOpenEarlyAccess(plan)}
        />

        {/* 10. FAQ Accordion */}
        <FAQSection />

        {/* 11. Final Call-to-Action with Email Capture */}
        <FinalCTA />

      </main>

      {/* 13. Footer */}
      <Footer 
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onOpenTerms={() => setTermsOpen(true)}
        onOpenContact={() => setContactOpen(true)}
        onOpenEarlyAccess={() => handleOpenEarlyAccess('Growth')}
        onOpenSignIn={() => setSignInOpen(true)}
      />

      {/* Interactive Modals */}
      <SignInModal 
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSuccessDemo={handleOpenDashboard}
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

export default App
