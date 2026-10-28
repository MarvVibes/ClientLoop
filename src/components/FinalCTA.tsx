import React from 'react'
import { ArrowRight, Zap } from 'lucide-react'

interface FinalCTAProps {
  onGetStarted?: () => void
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onGetStarted }) => {
  return (
    <section id="early-access" aria-labelledby="cta-title" className="px-5 py-20 sm:px-8 bg-[#FAF9F5]">
      <div className="max-w-6xl mx-auto">
        <div className="bg-ink-gradient relative overflow-hidden rounded-[28px] px-6 py-16 text-center text-white sm:px-12 sm:py-24 shadow-2xl">
          
          {/* Decorative glow blobs */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-mono font-medium text-slate-200 mb-6">
              <Zap className="w-3 h-3 text-teal-400" />
              100% Free — No credit card required
            </span>

            <h2 id="cta-title" className="display mx-auto max-w-3xl text-[36px] sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.12]">
              Build stronger customer relationships,{' '}
              <em className="font-serif italic font-normal text-white not-italic">
                one visit at a time.
              </em>
            </h2>

            <p className="mx-auto mt-5 max-w-lg text-slate-300 text-base sm:text-lg">
              Register your business in minutes and get instant access to every ClientLoop feature—completely free.
            </p>

            <div className="mt-10">
              <button
                type="button"
                id="final-cta-get-started"
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-slate-950 bg-white hover:bg-slate-100 active:bg-slate-200 rounded-full shadow-md transition-all cursor-pointer"
              >
                Create your free account
                <ArrowRight className="h-5 w-5" />
              </button>
              <p className="mt-4 text-xs font-mono text-slate-400">
                No credit card · No limits · Free forever
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
