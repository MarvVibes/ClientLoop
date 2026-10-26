import React from 'react'
import { 
  Users, 
  Repeat, 
  ClipboardList, 
  MessageSquare, 
  BarChart2, 
  ExternalLink, 
  Building2, 
  Download 
} from 'lucide-react'

export const FeaturesBento: React.FC = () => {
  const bottomFeatures = [
    {
      icon: BarChart2,
      title: 'Source & service analytics',
      body: 'See which channels and services bring people back.'
    },
    {
      icon: ExternalLink,
      title: 'Review-link management',
      body: 'Share your review link and track clicks—not reviews.'
    },
    {
      icon: Building2,
      title: 'Multi-staff, multi-location ready',
      body: 'Foundations for teams and branches as you grow.'
    },
    {
      icon: Download,
      title: 'Dashboard & data export',
      body: 'Your data stays yours. Export to CSV anytime.'
    }
  ]

  return (
    <section id="features" aria-labelledby="features-title" className="py-20 lg:py-28 px-5 sm:px-8 bg-[#FAF9F5] border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="max-w-3xl">
          <p className="eyebrow" id="features-title">
            Features
          </p>
          <h2 className="display mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
            Everything the loop needs,{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              nothing it doesn't.
            </em>
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          
          {/* Card 1: Customer profiles (lg:col-span-4) */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-soft flex flex-col justify-between">
            <div>
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
                Customer profiles & visit history
              </h3>
              <p className="mt-2 max-w-md text-slate-600">
                One record per customer, with every visit, service and note in order.
              </p>
            </div>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
              {[
                { name: 'Amara O.', visits: '7 visits', init: 'AO' },
                { name: 'Daniel K.', visits: '3 visits', init: 'DK' },
                { name: 'Grace M.', visits: '1 visit', init: 'GM' }
              ].map((c) => (
                <div key={c.name} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">
                    {c.init}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-900">{c.name}</p>
                    <p className="text-[11px] text-slate-500">{c.visits}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: New vs returning (lg:col-span-2) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-soft flex flex-col justify-between">
            <div>
              <Repeat className="h-5 w-5 text-teal-600" />
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
                New vs returning
              </h3>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline gap-1">
                <span className="display text-5xl font-semibold text-slate-900">58</span>
                <span className="text-slate-500 font-medium">% returning</span>
              </div>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-teal-100">
                <div className="w-[58%] bg-teal-600 rounded-full" />
              </div>
            </div>
          </div>

          {/* Card 3: Configurable questionnaires (lg:col-span-2) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-soft flex flex-col justify-between">
            <div>
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
                Configurable questionnaires
              </h3>
              <p className="mt-2 text-slate-600">
                Ratings, choices and open answers—your questions, your order.
              </p>
            </div>
          </div>

          {/* Card 4: WhatsApp follow-ups (lg:col-span-4) - Midnight Dark Ink */}
          <div className="lg:col-span-4 bg-ink-gradient rounded-2xl p-6 text-white sm:p-8 shadow-panel flex flex-col justify-between">
            <div>
              <MessageSquare className="h-5 w-5 text-teal-400" />
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
                WhatsApp follow-ups, with permission
              </h3>
              <p className="mt-2 max-w-md text-slate-300">
                Message only customers who agreed to hear from you. Opt-outs stop future sends.{' '}
                <span className="text-slate-400">(Planned — not yet connected.)</span>
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-[12px]">
              {['Consent recorded', 'Opt-out honoured', 'Send log'].map((tag) => (
                <span key={tag} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 font-medium text-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom 4 Cards (lg:col-span-3 each) */}
          {bottomFeatures.map((feat) => {
            const Icon = feat.icon
            return (
              <div key={feat.title} className="lg:col-span-3 flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                <Icon className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold tracking-tight text-slate-900">
                    {feat.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-slate-600 leading-normal">
                    {feat.body}
                  </p>
                </div>
              </div>
            )
          })}

        </div>

      </div>
    </section>
  )
}
