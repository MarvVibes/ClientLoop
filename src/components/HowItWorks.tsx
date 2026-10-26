import React from 'react'
import { ClipboardPen, BarChart2, Send, ExternalLink } from 'lucide-react'

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      n: '01',
      icon: ClipboardPen,
      title: 'Record the visit',
      body: 'Capture a customer interaction in a few moments—name, service, staff, and how they found you.'
    },
    {
      n: '02',
      icon: BarChart2,
      title: 'Learn what matters',
      body: 'Collect feedback and see discovery sources and service history come together.'
    },
    {
      n: '03',
      icon: Send,
      title: 'Follow up thoughtfully',
      body: 'Send permitted follow-ups and invite customers to leave an honest review.'
    }
  ]

  const bars = [40, 62, 50, 78, 66, 90]

  return (
    <section id="how" aria-labelledby="how-title" className="py-20 lg:py-28 px-5 sm:px-8 bg-[#FAF9F5] border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="eyebrow" id="how-title">
            How it works
          </p>
          <h2 className="display mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
            Three steps,{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              one loop.
            </em>
          </h2>
        </div>

        {/* Steps Grid */}
        <ol className="relative mt-16 grid gap-6 lg:grid-cols-3">
          {/* Connecting line on desktop */}
          <div className="absolute left-0 right-0 top-[42px] hidden h-px bg-slate-200/80 lg:block" aria-hidden="true" />

          {steps.map((st, idx) => {
            const Icon = st.icon
            return (
              <li key={st.n} className="relative flex flex-col justify-between">
                <div>
                  {/* Step Icon & Number */}
                  <div className="relative z-10 mb-6 flex items-center gap-3">
                    <span className="grid h-[84px] w-[84px] place-items-center rounded-2xl border border-slate-200 bg-white shadow-soft">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </span>
                    <span className="font-mono text-xs text-slate-400 font-medium">{st.n}</span>
                  </div>

                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    {st.title}
                  </h3>
                  <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                    {st.body}
                  </p>
                </div>

                {/* Step Subcard */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                  {idx === 0 && (
                    <div className="space-y-2 text-[13px]">
                      <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                        <span className="text-slate-500">Customer</span>
                        <span className="font-medium text-slate-900">Daniel K.</span>
                      </div>
                      <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                        <span className="text-slate-500">Service</span>
                        <span className="font-medium text-slate-900">Haircut</span>
                      </div>
                      <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                        <span className="text-slate-500">Source</span>
                        <span className="font-medium text-slate-900">Referral</span>
                      </div>
                      <div className="rounded-lg bg-slate-900 py-2 text-center text-white font-medium text-xs">
                        Save visit
                      </div>
                    </div>
                  )}

                  {idx === 1 && (
                    <div className="flex h-[148px] items-end gap-2 px-2 py-1">
                      {bars.map((height, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-md transition-all duration-500 ${
                            i % 2 === 1 ? 'bg-teal-600' : 'bg-blue-600'
                          }`}
                          style={{
                            height: `${height}%`,
                            opacity: 0.5 + i * 0.09
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {idx === 2 && (
                    <div className="space-y-3 text-[13px]">
                      <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-xs bg-teal-50 border border-teal-100 px-3.5 py-2.5 text-teal-950 font-medium leading-relaxed">
                        Thanks for coming in, Daniel! Mind sharing a quick review?
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="font-mono text-xs text-blue-600 truncate">review link</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1 text-center">
                        Sent to opted-in customers only · Reply STOP to opt out
                      </p>
                    </div>
                  )}
                </div>

              </li>
            )
          })}
        </ol>

      </div>
    </section>
  )
}
