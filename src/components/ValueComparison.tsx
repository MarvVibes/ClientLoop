import React from 'react'
import { Check } from 'lucide-react'

export const ValueComparison: React.FC = () => {
  const beforeItems = [
    { text: 'Receipts in the till', rot: -1.5 },
    { text: 'Feedback in DMs', rot: 1 },
    { text: "Regulars in someone's head", rot: -0.5 },
    { text: 'Reviews left to chance', rot: 1.5 }
  ]

  const withClientLoopItems = [
    'Every visit recorded',
    'Feedback, structured',
    'Returning rate, visible',
    'Review invites, tracked'
  ]

  return (
    <section id="gap" aria-labelledby="problem-title" className="py-20 lg:py-28 px-5 sm:px-8 bg-[#FAF9F5] border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          
          {/* Left Column: Heading and Story */}
          <div className="space-y-4">
            <p className="eyebrow" id="problem-title">
              The gap
            </p>
            <h2 className="display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.15]">
              Know more than{' '}
              <em className="font-serif italic font-normal text-slate-900 not-italic">
                how busy
              </em>{' '}
              you were.
            </h2>
            <p className="text-[17px] leading-relaxed text-slate-600 pt-2">
              Most service businesses can see today's transactions. Fewer can see who came back, how they found you, what they thought, and whether anyone followed up. Those answers live in notebooks, chats and memory—if at all.
            </p>
          </div>

          {/* Right Column: Before vs With ClientLoop */}
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* Before Card */}
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 bg-white/40">
              <p className="eyebrow">
                Before
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px] text-slate-600">
                {beforeItems.map((item) => (
                  <li
                    key={item.text}
                    className="rounded-lg bg-slate-100/90 px-3 py-2 shadow-2xs font-medium text-slate-700 transition-transform duration-200"
                    style={{ transform: `rotate(${item.rot}deg)` }}
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* With ClientLoop Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <p className="eyebrow text-blue-600">
                With ClientLoop
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                {withClientLoopItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-200/90 bg-slate-50/50 px-3 py-2 font-medium text-slate-800"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
                      <Check className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
