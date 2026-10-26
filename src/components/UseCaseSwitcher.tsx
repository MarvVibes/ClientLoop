import React, { useState } from 'react'
import { Scissors, Utensils, Wrench, Sparkles, Briefcase } from 'lucide-react'

interface UseCaseData {
  id: string
  label: string
  icon: React.ElementType
  services: string[]
  question: string
  followup: string
  insight: string
}

const USE_CASES: UseCaseData[] = [
  {
    id: 'salon',
    label: 'Salon & Beauty',
    icon: Scissors,
    services: ['Cut & style', 'Colour', 'Nails'],
    question: 'How happy are you with your look today?',
    followup: 'A gentle rebooking note 5 weeks after a cut.',
    insight: 'See which stylists your returning clients ask for.'
  },
  {
    id: 'hosp',
    label: 'Hospitality',
    icon: Utensils,
    services: ['Dine-in', 'Takeaway', 'Events'],
    question: 'How was your food and service tonight?',
    followup: 'A thank-you after a private event booking.',
    insight: 'Compare first-time and regular guests by day of week.'
  },
  {
    id: 'repair',
    label: 'Repair & Home Services',
    icon: Wrench,
    services: ['Diagnosis', 'Repair', 'Maintenance'],
    question: 'Was the job completed as explained?',
    followup: 'A check-in two weeks after a repair.',
    insight: 'Track which services lead to repeat bookings.'
  },
  {
    id: 'well',
    label: 'Wellness',
    icon: Sparkles,
    services: ['Massage', 'Physio', 'Classes'],
    question: "How do you feel after today's session?",
    followup: 'A reminder when a package is nearly used.',
    insight: 'Understand which treatments keep people returning.'
  },
  {
    id: 'pro',
    label: 'Professional Services',
    icon: Briefcase,
    services: ['Consultation', 'Project', 'Retainer'],
    question: 'How clear was our advice today?',
    followup: 'A follow-up after a project milestone.',
    insight: 'See where new clients first heard about you.'
  }
]

export const UseCaseSwitcher: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('salon')
  const current = USE_CASES.find((u) => u.id === activeId) || USE_CASES[0]

  return (
    <section id="use-cases" aria-labelledby="uc-title" className="py-20 lg:py-28 px-5 sm:px-8 bg-[#FAF9F5] border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="max-w-3xl">
          <p className="eyebrow" id="uc-title">
            Use cases
          </p>
          <h2 className="display mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
            One product,{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              configured
            </em>{' '}
            for your trade.
          </h2>
          <p className="mt-4 text-[16px] text-slate-600">
            The core stays the same. Services, questions and follow-ups adapt to how you work.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          
          {/* Vertical Tabs */}
          <div role="radiogroup" aria-label="Industry" className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon
              const isSelected = uc.id === activeId
              return (
                <button
                  key={uc.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setActiveId(uc.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-white text-slate-900 shadow-soft'
                      : 'border-slate-200/90 text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  {uc.label}
                </button>
              )
            })}
          </div>

          {/* Right Configuration Card */}
          <div className="grid min-w-0 gap-4 rounded-3xl border border-slate-200 bg-[#FBFBFA] p-6 sm:grid-cols-2 sm:p-8 shadow-soft">
            <div className="sm:col-span-2 space-y-1">
              <h3 className="display text-2xl sm:text-3xl font-semibold text-slate-900">
                ClientLoop for {current.label}
              </h3>
              <p className="font-mono text-[11px] text-slate-500 uppercase tracking-wider">
                Example configuration
              </p>
            </div>

            {/* Subcard: Services */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <p className="eyebrow">Services</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {current.services.map((srv) => (
                  <span key={srv} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[13px] font-medium text-slate-700">
                    {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Subcard: Feedback Question */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <p className="eyebrow">Feedback question</p>
              <p className="mt-3 text-[15px] font-medium text-slate-800 leading-snug">
                “{current.question}”
              </p>
            </div>

            {/* Subcard: Follow-up idea */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <p className="eyebrow">Follow-up idea</p>
              <p className="mt-3 text-[15px] text-slate-600 leading-snug">
                {current.followup}
              </p>
            </div>

            {/* Subcard: Insight */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <p className="eyebrow">Insight</p>
              <p className="mt-3 text-[15px] text-slate-600 leading-snug">
                {current.insight}
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
