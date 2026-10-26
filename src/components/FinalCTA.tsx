import React, { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export const FinalCTA: React.FC = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success'>('idle')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setStatus('success')
  }

  return (
    <section id="early-access" aria-labelledby="cta-title" className="px-5 py-20 sm:px-8 bg-[#FAF9F5]">
      <div className="max-w-6xl mx-auto">
        <div className="bg-ink-gradient relative overflow-hidden rounded-[28px] px-6 py-16 text-center text-white sm:px-12 sm:py-24 shadow-2xl">
          
          <h2 id="cta-title" className="display mx-auto max-w-3xl text-[36px] sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.12]">
            Build stronger customer relationships,{' '}
            <em className="font-serif italic font-normal text-white not-italic">
              one visit at a time.
            </em>
          </h2>

          <p className="mx-auto mt-5 max-w-lg text-slate-300 text-base sm:text-lg">
            Join early access and help shape ClientLoop for businesses like yours.
          </p>

          <div className="mt-8 max-w-md mx-auto">
            {status === 'success' ? (
              <div className="flex items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 p-4 text-sm font-medium text-white backdrop-blur-md">
                <CheckCircle2 className="h-5 w-5 text-teal-400" />
                <span>Thank you! We'll reach out with your early access invite.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 p-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  required
                  className="flex-1 bg-transparent px-5 py-3 text-sm text-white placeholder-slate-400 focus:outline-none rounded-full"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 active:bg-slate-200 rounded-full shadow-md transition-all cursor-pointer shrink-0"
                >
                  Get early access
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 text-xs font-mono text-slate-400">
            Demo form — sign-ups aren't stored yet.
          </p>

        </div>
      </div>
    </section>
  )
}
