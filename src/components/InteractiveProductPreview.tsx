import React, { useState } from 'react'
import { Check, MessageSquare } from 'lucide-react'

interface ProductTab {
  id: string
  label: string
  title: string
  body: string
  points: string[]
}

const PRODUCT_TABS: ProductTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'One calm view of the week.',
    body: 'Visits, returning customers and feedback completion side by side, so you can tell a busy week from a healthy one.',
    points: ['Business-level KPIs', 'New vs returning split', 'Filter by date range']
  },
  {
    id: 'insights',
    label: 'Customer insights',
    title: 'Every customer, with context.',
    body: 'Profiles gather visit history, services and feedback in one place—so the next conversation starts where the last one ended.',
    points: ['Visit timeline', 'Preferred services', 'Discovery source']
  },
  {
    id: 'feedback',
    label: 'Feedback',
    title: 'Questions that fit your business.',
    body: 'Build short questionnaires with ratings and open answers. See themes emerge without reading every reply twice.',
    points: ['Configurable questions', 'Completion tracking', 'Theme summaries']
  },
  {
    id: 'followups',
    label: 'Follow-ups',
    title: 'Follow up, with permission.',
    body: 'Queue thoughtful messages to customers who opted in. Opt-outs are honoured automatically, and every send is logged.',
    points: ['Consent-aware queue', 'Opt-out controls', 'Message history']
  }
]

export const InteractiveProductPreview: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>('overview')

  const currentTab = PRODUCT_TABS.find((t) => t.id === activeTabId) || PRODUCT_TABS[0]

  return (
    <section id="product" aria-labelledby="product-title" className="py-20 lg:py-28 px-5 sm:px-8 border-t border-slate-200/80 bg-[#FAF9F5]">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="max-w-3xl">
          <p className="eyebrow" id="product-title">
            The product
          </p>
          <h2 className="display mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
            A workspace built around{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              the people
            </em>{' '}
            you serve.
          </h2>
        </div>

        {/* Tab Pills */}
        <div className="mt-10">
          <div role="tablist" aria-label="Product features" className="flex flex-wrap gap-2">
            {PRODUCT_TABS.map((tab) => {
              const isActive = tab.id === activeTabId
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Main Card */}
          <div className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-soft">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              
              {/* Left Column: Copy & Checklist */}
              <div className="space-y-6">
                <h3 className="display text-2xl sm:text-3xl font-semibold text-slate-900">
                  {currentTab.title}
                </h3>
                <p className="text-[16px] leading-relaxed text-slate-600">
                  {currentTab.body}
                </p>

                <ul className="space-y-3 pt-2">
                  {currentTab.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-50 text-teal-700">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-full px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    SAMPLE DATA
                  </span>
                </div>
              </div>

              {/* Right Column: Tab View Preview */}
              <div className="min-w-0">
                {activeTabId === 'overview' && (
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-xs text-slate-500">Visits this week</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">214</p>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: '72%' }} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-xs text-slate-500">Returning rate</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">58%</p>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-600" style={{ width: '58%' }} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-xs text-slate-500">Feedback completed</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">41%</p>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: '41%' }} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-xs text-slate-500">Follow-ups sent</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">36</p>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: '36%' }} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTabId === 'insights' && (
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 font-semibold text-blue-700">
                          AO
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">Amara Okafor</p>
                          <p className="text-xs text-slate-500">Customer since Mar · found via Referral</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 border border-teal-200">
                        Returning
                      </span>
                    </div>

                    <ol className="mt-5 space-y-3 border-l border-slate-200 pl-4 ml-2">
                      <li className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600" />
                        <p className="text-[13px] font-medium text-slate-900">
                          Signature cut <span className="font-mono text-[11px] font-normal text-slate-400">· Oct 12</span>
                        </p>
                        <p className="text-xs text-slate-500">Rated 5/5</p>
                      </li>
                      <li className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600" />
                        <p className="text-[13px] font-medium text-slate-900">
                          Colour & tone <span className="font-mono text-[11px] font-normal text-slate-400">· Sep 03</span>
                        </p>
                        <p className="text-xs text-slate-500">Feedback completed</p>
                      </li>
                      <li className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600" />
                        <p className="text-[13px] font-medium text-slate-900">
                          Consultation <span className="font-mono text-[11px] font-normal text-slate-400">· Jul 21</span>
                        </p>
                        <p className="text-xs text-slate-500">First visit</p>
                      </li>
                    </ol>
                  </div>
                )}

                {activeTabId === 'feedback' && (
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <p className="text-xs font-medium text-slate-500">Questionnaire · After visit</p>
                    <p className="mt-3 text-[14px] font-medium text-slate-900">How would you rate today's service?</p>
                    <div className="mt-2 grid grid-cols-5 gap-1.5 max-w-[240px]">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <span
                          key={num}
                          className={`grid h-9 place-items-center rounded-lg border text-sm font-medium ${
                            num === 4 
                              ? 'border-blue-600 bg-blue-600 text-white' 
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {num}
                        </span>
                      ))}
                    </div>

                    <p className="mt-5 text-[14px] font-medium text-slate-900">How did you hear about us?</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {['Friend', 'Google', 'Instagram', 'Walked by'].map((src, i) => (
                        <span
                          key={src}
                          className={`rounded-lg border px-3 py-1.5 text-[13px] ${
                            i === 0
                              ? 'border-teal-300 bg-teal-50 text-teal-700 font-medium'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {src}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 rounded-lg bg-white border border-slate-200 p-3 text-[13px] text-slate-600 italic">
                      “Quick, friendly, would love an earlier slot on Saturdays.”
                    </div>
                  </div>
                )}

                {activeTabId === 'followups' && (
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <p className="text-[13px] font-medium text-slate-900">Follow-up queue</p>
                      <span className="font-mono text-[11px] text-slate-500">3 ready · 1 skipped</span>
                    </div>

                    <ul className="mt-3 divide-y divide-slate-200">
                      <li className="flex items-center gap-3 py-2.5">
                        <MessageSquare className="h-4 w-4 shrink-0 text-teal-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-900">Daniel K.</p>
                          <p className="truncate text-xs text-slate-500">Thanks for visiting — how did it go?</p>
                        </div>
                        <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                          Opted in
                        </span>
                      </li>

                      <li className="flex items-center gap-3 py-2.5">
                        <MessageSquare className="h-4 w-4 shrink-0 text-teal-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-900">Grace M.</p>
                          <p className="truncate text-xs text-slate-500">Your next appointment reminder</p>
                        </div>
                        <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                          Opted in
                        </span>
                      </li>

                      <li className="flex items-center gap-3 py-2.5">
                        <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-900">Tunde A.</p>
                          <p className="truncate text-xs text-slate-400">—</p>
                        </div>
                        <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Opted out
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
