import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'What is ClientLoop?',
    answer: 'ClientLoop is a customer insights, follow-up and review management workspace for service businesses. It connects visits, feedback, follow-ups and review invitations in one place.'
  },
  {
    question: 'Which businesses can use it?',
    answer: 'Any service business that sees customers repeatedly—salons, barbershops, spas, restaurants, repair services, clinics, consultants and more. Services and questions are configurable.'
  },
  {
    question: 'Can I customize the questionnaire for my business?',
    answer: 'Yes. You choose the questions, answer types and order, so feedback fits your services.'
  },
  {
    question: 'How do WhatsApp follow-ups work?',
    answer: "The plan is to let you send follow-ups only to customers who've given permission, with opt-out respected automatically. WhatsApp sending isn't connected yet in early access."
  },
  {
    question: 'Does a review-link click mean a customer posted a Google review?',
    answer: "No. ClientLoop can record that a review link was clicked, but a click alone can't tell us whether a review was actually written or published. We never report clicks as reviews."
  },
  {
    question: 'Can multiple staff members use one workspace?',
    answer: 'The product is designed for multi-staff workspaces. Staff roles and permissions are part of the roadmap for early access.'
  },
  {
    question: 'Can I export my data?',
    answer: 'Data export is part of the planned feature set—your business data should always stay yours.'
  }
]

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-20 lg:py-28 px-5 sm:px-8 bg-[#FAF9F5] border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start">
          
          {/* Left Column: Heading */}
          <div className="space-y-4">
            <p className="eyebrow" id="faq-title">
              FAQ
            </p>
            <h2 className="display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.15]">
              Questions,{' '}
              <em className="font-serif italic font-normal text-slate-900 not-italic">
                answered.
              </em>
            </h2>
          </div>

          {/* Right Column: Accordion */}
          <div className="border-t border-slate-200 divide-y divide-slate-200">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx
              return (
                <div key={item.question} className="py-2">
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="w-full py-4 flex items-center justify-between text-left text-[16px] font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-5 pt-1 text-[15px] leading-relaxed text-slate-600 animate-fadeIn">
                      {item.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
