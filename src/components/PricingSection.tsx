import React from 'react'

interface PricingProps {
  onSelectPlan: (plan: string) => void
}

export const PricingSection: React.FC<PricingProps> = ({ onSelectPlan }) => {
  const plans = [
    {
      name: 'Starter',
      for: 'Single-location businesses getting organised.',
      price: 'TBA',
      featured: false,
      items: ['Customer profiles', 'Visit recording', 'Basic feedback']
    },
    {
      name: 'Growth',
      for: 'Teams that want follow-ups and deeper insights.',
      price: 'TBA',
      featured: true,
      items: [
        'Everything in Starter',
        'Configurable questionnaires',
        'Follow-up queue',
        'Review-link tracking'
      ]
    },
    {
      name: 'Multi-location',
      for: 'Businesses with several branches or teams.',
      price: 'TBA',
      featured: false,
      items: [
        'Everything in Growth',
        'Multiple locations',
        'Staff roles',
        'Data export'
      ]
    }
  ]

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="py-20 lg:py-28 px-5 sm:px-8 border-y border-slate-200/80 bg-[#FBFBFA]">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="eyebrow" id="pricing-title">
            Pricing
          </p>
          <h2 className="display mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
            Pricing is{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              coming soon.
            </em>
          </h2>
          <p className="mt-4 text-[16px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
            We're finalising plans with early-access businesses. Join now to help shape them—tiers below are indicative and may change.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex h-full flex-col justify-between rounded-2xl border p-7 sm:p-8 transition-all ${
                p.featured
                  ? 'bg-ink-gradient border-transparent text-white shadow-xl'
                  : 'border-slate-200 bg-white shadow-soft text-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold tracking-tight">
                    {p.name}
                  </h3>
                  <span className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                    p.featured 
                      ? 'border-white/20 bg-white/10 text-slate-200' 
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    Early access
                  </span>
                </div>

                <p className={`mt-2 text-[14px] ${p.featured ? 'text-slate-300' : 'text-slate-600'}`}>
                  {p.for}
                </p>

                <div className="mt-6 pb-6 border-b border-dashed border-slate-200/40">
                  <span className="display text-4xl sm:text-5xl font-semibold tracking-tight">
                    {p.price}
                  </span>
                </div>

                <ul className="mt-6 space-y-3 text-[14px]">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-center gap-2.5">
                      <span className={`text-xs ${p.featured ? 'text-teal-400' : 'text-slate-400'}`}>—</span>
                      <span className={p.featured ? 'text-slate-200' : 'text-slate-700'}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="button"
                  onClick={() => onSelectPlan(p.name)}
                  className={`w-full py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                    p.featured
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-md'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-xs'
                  }`}
                >
                  Join early access
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
