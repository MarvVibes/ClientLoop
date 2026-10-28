import React from 'react'
import { Check, Zap } from 'lucide-react'

interface PricingProps {
  onSelectPlan: (plan: string) => void
}

const FREE_FEATURES = [
  'Unlimited customer profiles',
  'Visit recording & history',
  'Configurable feedback questionnaires',
  'WhatsApp follow-up queue',
  'Review-link tracking',
  'Business analytics dashboard',
  'Multiple staff accounts',
  'Data export',
]

export const PricingSection: React.FC<PricingProps> = ({ onSelectPlan }) => {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="py-20 lg:py-28 px-5 sm:px-8 border-y border-slate-200/80 bg-[#FBFBFA]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="eyebrow" id="pricing-title">
            Pricing
          </p>
          <h2 className="display mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
            Free,{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              for everyone.
            </em>
          </h2>
          <p className="mt-4 text-[16px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
            ClientLoop is completely free to use. Register your business today and get instant access to every feature—no credit card required, no hidden fees.
          </p>
        </div>

        {/* Single Free Card */}
        <div className="mt-14 max-w-lg mx-auto">
          <div className="flex flex-col justify-between rounded-2xl bg-ink-gradient border-transparent text-white shadow-2xl p-8 sm:p-10">
            <div>
              {/* Plan Header */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-2xl font-semibold tracking-tight">Free</h3>
                <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full border border-white/20 bg-white/10 text-slate-200 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> All features included
                </span>
              </div>

              <p className="mt-2 text-[14px] text-slate-300">
                Everything you need to manage clients and grow your reputation.
              </p>

              {/* Price */}
              <div className="mt-8 pb-8 border-b border-dashed border-white/20">
                <div className="flex items-end gap-2">
                  <span className="display text-6xl sm:text-7xl font-semibold tracking-tight">
                    $0
                  </span>
                  <span className="text-slate-300 text-base mb-3">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">No credit card required. No limits.</p>
              </div>

              {/* Features List */}
              <ul className="mt-8 space-y-3.5 text-[14px]">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-teal-400/20 border border-teal-400/30 flex items-center justify-center">
                      <Check className="w-3 h-3 text-teal-400" />
                    </span>
                    <span className="text-slate-200">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-10">
              <button
                type="button"
                onClick={() => onSelectPlan('Free')}
                className="w-full py-3.5 rounded-full text-sm font-bold transition-all cursor-pointer bg-white hover:bg-slate-100 text-slate-950 shadow-md"
              >
                Get started free — no card needed
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
