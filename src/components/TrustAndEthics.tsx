import React from 'react'
import { Building2, ShieldCheck, UserX, BarChart3 } from 'lucide-react'

export const TrustAndEthics: React.FC = () => {
  const principles = [
    {
      icon: Building2,
      title: 'A workspace per business',
      body: "Each business gets its own workspace. Customer records aren't shared between businesses."
    },
    {
      icon: ShieldCheck,
      title: 'Permission first',
      body: 'Follow-ups are meant for customers who agreed to hear from you. Consent is recorded with the profile.'
    },
    {
      icon: UserX,
      title: 'Easy opt-out',
      body: 'Customers can opt out, and opted-out profiles are excluded from future follow-ups.'
    },
    {
      icon: BarChart3,
      title: 'Honest metrics',
      body: 'We report what we can observe. A link click is a click—never presented as a posted review.'
    }
  ]

  return (
    <section id="principles" aria-labelledby="trust-title" className="py-20 lg:py-28 px-5 sm:px-8 bg-[#FAF9F5] border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start">
          
          {/* Left Column: Heading */}
          <div className="space-y-4">
            <p className="eyebrow" id="trust-title">
              Product principles
            </p>
            <h2 className="display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.15]">
              Built to be{' '}
              <em className="font-serif italic font-normal text-slate-900 not-italic">
                trusted
              </em>{' '}
              by your customers, too.
            </h2>
          </div>

          {/* Right Column: 4 Cards in border grid */}
          <div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 shadow-soft">
            {principles.map((pr) => {
              const Icon = pr.icon
              return (
                <div key={pr.title} className="bg-white p-6 sm:p-7">
                  <Icon className="h-5 w-5 text-teal-600" />
                  <h3 className="mt-4 font-semibold tracking-tight text-slate-900 text-[17px]">
                    {pr.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] text-slate-600 leading-relaxed">
                    {pr.body}
                  </p>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
