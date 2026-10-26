import React, { useState } from 'react'
import { 
  ClipboardPen, 
  Send, 
  CheckCircle, 
  BarChart2, 
  Star,
  Sparkles
} from 'lucide-react'

interface JourneyStage {
  label: string
  icon: React.ElementType
  body: string
  note: string
  detail: [string, string][]
}

const JOURNEY_STAGES: JourneyStage[] = [
  {
    label: 'Visit recorded',
    icon: ClipboardPen,
    body: "Staff log the visit. This creates or updates the customer's profile.",
    note: 'Fact: a visit happened.',
    detail: [
      ['Status', 'Recorded'],
      ['Service', 'Signature cut'],
      ['Consent', 'Follow-ups: yes']
    ]
  },
  {
    label: 'Feedback invitation',
    icon: Send,
    body: 'An invitation is queued and, if permitted, sent. Sent and delivered are tracked separately.',
    note: "Delivered doesn't mean read.",
    detail: [
      ['Invitation', 'Sent 10:42'],
      ['Delivery', 'Delivered 10:42'],
      ['Opened', 'Not yet']
    ]
  },
  {
    label: 'Questionnaire completed',
    icon: CheckCircle,
    body: 'The customer answers your questions. Only completed responses count toward completion rate.',
    note: 'Fact: the customer responded.',
    detail: [
      ['Rating', '4 / 5'],
      ['Source', 'Referral'],
      ['Comment', 'Yes']
    ]
  },
  {
    label: 'Insights updated',
    icon: BarChart2,
    body: 'Dashboards refresh with the new answer—returning rate, sources and service trends.',
    note: 'Aggregated per workspace.',
    detail: [
      ['Returning', '58% → 58.3%'],
      ['Referral share', '38%'],
      ['Avg rating', '4.6']
    ]
  },
  {
    label: 'Optional review link',
    icon: Star,
    body: "Satisfied customers may be invited to review you publicly. We can track a link click—we can't see whether a review was actually posted.",
    note: 'A click is not a review.',
    detail: [
      ['Review link', 'Clicked'],
      ['Public review', 'Unknown'],
      ['Inferred?', 'Never']
    ]
  }
]

export const CustomerJourney: React.FC = () => {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0)
  const currentStage = JOURNEY_STAGES[activeStageIndex]

  return (
    <section id="journey" aria-labelledby="journey-title" className="py-20 lg:py-28 px-5 sm:px-8 border-y border-slate-200/80 bg-[#FBFBFA]">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="eyebrow" id="journey-title">
            Customer journey
          </p>
          <h2 className="display mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
            Every step,{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              honestly
            </em>{' '}
            measured.
          </h2>
          <p className="mt-4 text-[16px] text-slate-600">
            Select a stage to see what ClientLoop records—and what it doesn't claim to know.
          </p>
        </div>

        {/* Stage Timeline Buttons */}
        <div className="mt-14 max-w-4xl mx-auto">
          <ol className="grid grid-cols-5 gap-1 sm:gap-2 relative">
            {JOURNEY_STAGES.map((st, idx) => {
              const Icon = st.icon
              const isSelected = idx === activeStageIndex
              const isPast = idx < activeStageIndex
              return (
                <li key={st.label} className="relative text-center">
                  {/* Connecting Line */}
                  {idx < JOURNEY_STAGES.length - 1 && (
                    <span 
                      className={`absolute left-1/2 top-5 h-px w-full ${isPast ? 'bg-blue-600' : 'bg-slate-200'}`} 
                      aria-hidden="true" 
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveStageIndex(idx)}
                    className="relative z-10 mx-auto flex flex-col items-center gap-2 p-1 focus:outline-none cursor-pointer"
                  >
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full border transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                          : isPast
                          ? 'border-blue-600 bg-white text-blue-600'
                          : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`hidden sm:block text-[13px] font-medium transition-colors ${
                        isSelected ? 'text-slate-900 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {st.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {/* Active Stage Card */}
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-soft">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              
              {/* Left Column: Stage Explanation */}
              <div className="space-y-4">
                <span className="font-mono text-xs text-slate-400 font-medium">
                  Stage {activeStageIndex + 1} of {JOURNEY_STAGES.length}
                </span>
                <h3 className="display text-2xl sm:text-3xl font-semibold text-slate-900">
                  {currentStage.label}
                </h3>
                <p className="text-[16px] leading-relaxed text-slate-600">
                  {currentStage.body}
                </p>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-medium text-amber-800">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    {currentStage.note}
                  </span>
                </div>
              </div>

              {/* Right Column: Sample Data Detail Table */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="font-mono text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-full px-2.5 py-0.5">
                    • SAMPLE DATA
                  </span>
                  <span className="text-xs font-mono text-slate-400">LEDGER RECORD</span>
                </div>

                <dl className="mt-3 divide-y divide-slate-200/80 text-[14px]">
                  {currentStage.detail.map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2.5">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-medium text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
