import React, { useState } from 'react'
import { 
  ArrowRight, 
  Calendar, 
  ChevronDown, 
  TrendingUp, 
  LayoutGrid, 
  Users, 
  MessageSquare, 
  Send, 
  Star, 
  BarChart2, 
  Settings
} from 'lucide-react'
import { LogoIcon } from './Logo'

interface HeroProps {
  onOpenEarlyAccess: () => void
  onExploreProduct: () => void
}

const BUSINESS_WORKSPACES = ['Northside Studio', 'Harbor Bistro', 'FixRight Repairs']

const DATE_RANGES = ['7D', '30D', '90D'] as const
type DateRange = typeof DATE_RANGES[number]

const WORKSPACE_METRICS: Record<DateRange, { visits: number; returning: number; feedback: number; bars: number[] }> = {
  '7D': { visits: 214, returning: 58, feedback: 41, bars: [22, 31, 28, 36, 40, 33, 24] },
  '30D': { visits: 928, returning: 61, feedback: 44, bars: [180, 210, 240, 298] },
  '90D': { visits: 2741, returning: 63, feedback: 39, bars: [820, 910, 1011] }
}

const DISCOVERY_CHANNELS = [
  { label: 'Referral', pct: 38, color: 'bg-blue-600' },
  { label: 'Google search', pct: 27, color: 'bg-teal-600' },
  { label: 'Instagram', pct: 19, color: 'bg-sky-400' },
  { label: 'Walk-in', pct: 16, color: 'bg-amber-500' }
]

const POPULAR_SERVICES = [
  { name: 'Signature cut', count: 82, pct: 100 },
  { name: 'Colour & tone', count: 61, pct: 74 },
  { name: 'Treatment', count: 44, pct: 54 },
  { name: 'Consultation', count: 27, pct: 33 }
]

const RECENT_ACTIVITIES = [
  { who: 'Amara O.', what: 'Completed feedback', when: '2m', avatar: 'AO', tone: 'bg-teal-50 text-teal-700 border-teal-200' },
  { who: 'Daniel K.', what: 'Visit recorded · Haircut', when: '14m', avatar: 'DK', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  { who: 'Grace M.', what: 'Opened review link', when: '38m', avatar: 'GM', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { who: 'Tunde A.', what: 'Opted out of follow-ups', when: '1h', avatar: 'TA', tone: 'bg-rose-50 text-rose-700 border-rose-200' }
]

export const Hero: React.FC<HeroProps> = ({ onOpenEarlyAccess, onExploreProduct }) => {
  const [selectedBusinessIndex, setSelectedBusinessIndex] = useState(0)
  const [selectedRange, setSelectedRange] = useState<DateRange>('30D')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const activeRangeData = WORKSPACE_METRICS[selectedRange]
  const visitsValue = activeRangeData.visits + selectedBusinessIndex * 111
  const returningValue = activeRangeData.returning - (selectedBusinessIndex ? 3 : 0)
  const feedbackValue = activeRangeData.feedback + selectedBusinessIndex

  return (
    <section className="relative px-5 pt-28 pb-16 sm:px-8 sm:pt-36 lg:pt-40 lg:pb-20 overflow-hidden bg-[#FAF9F5]">
      {/* Background Grid Pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-40 bg-grid-pattern" 
        aria-hidden="true" 
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Top Header & Copy */}
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow">
            Customer relationships, made clearer
          </p>

          <h1 className="display mt-6 text-[36px] sm:text-5xl lg:text-[64px] xl:text-[72px] leading-[1.08] tracking-tight">
            Turn every customer interaction into your{' '}
            <em className="font-serif italic font-normal text-slate-900 not-italic">
              next opportunity.
            </em>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-slate-600 sm:text-lg">
            Understand who comes back, what brings people in, and where to improve—then follow up thoughtfully and grow your reputation from one connected workspace.
          </p>

          {/* CTA Buttons */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onOpenEarlyAccess}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-full shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExploreProduct}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-full shadow-xs transition-all cursor-pointer"
            >
              Explore the product
            </button>
          </div>

          <p className="mt-6 text-[13px] text-slate-500">
            Free forever · No credit card required · Built for service businesses of every size.
          </p>
        </div>

        {/* Centerpiece Interactive Dashboard Mockup (Matching pixel-perfect replay) */}
        <div className="mt-12 lg:mt-14 max-w-5xl mx-auto">
          <div className="relative rounded-[22px] border border-slate-200/90 bg-[#FBFBFA] p-1.5 shadow-xl">
            <div className="flex overflow-hidden rounded-[18px] border border-slate-200/80 bg-white">
              
              {/* Left Thin Icon Sidebar */}
              <aside 
                className="hidden w-14 shrink-0 flex-col items-center gap-1.5 border-r border-slate-200/80 bg-slate-50/50 py-4 sm:flex"
                aria-hidden="true"
              >
                <div className="mb-4">
                  <LogoIcon className="h-7 w-7 text-blue-600" />
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600" title="Overview">
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Customers">
                  <Users className="h-4 w-4" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Feedback">
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Follow-ups">
                  <Send className="h-4 w-4" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Reviews">
                  <Star className="h-4 w-4" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Analytics">
                  <BarChart2 className="h-4 w-4" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 mt-auto" title="Settings">
                  <Settings className="h-4 w-4" />
                </button>
              </aside>

              {/* Main Canvas */}
              <div className="min-w-0 flex-1 p-4 sm:p-6 space-y-4">
                
                {/* Top Control Bar */}
                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  {/* Business Selector */}
                  <div className="relative min-w-0">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex h-auto max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-teal-50 text-[10px] font-semibold text-teal-700">
                        {BUSINESS_WORKSPACES[selectedBusinessIndex][0]}
                      </span>
                      <span className="min-w-0 truncate">{BUSINESS_WORKSPACES[selectedBusinessIndex]}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>

                    {dropdownOpen && (
                      <ul className="absolute left-0 top-10 z-20 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {BUSINESS_WORKSPACES.map((biz, idx) => (
                          <li key={biz}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBusinessIndex(idx)
                                setDropdownOpen(false)
                              }}
                              className={`w-full rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                                idx === selectedBusinessIndex 
                                  ? 'bg-blue-50 font-medium text-blue-700' 
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {biz}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Sample Data Pill & Date Range Filter */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden md:inline-flex items-center gap-1 font-mono text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-full px-2.5 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      SAMPLE DATA
                    </span>

                    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[12px]" role="group">
                      <Calendar className="mx-1.5 h-3.5 w-3.5 text-slate-400" />
                      {DATE_RANGES.map((rng) => (
                        <button
                          key={rng}
                          type="button"
                          onClick={() => setSelectedRange(rng)}
                          className={`rounded-md px-2 py-0.5 text-[12px] font-mono transition-colors cursor-pointer ${
                            selectedRange === rng
                              ? 'bg-slate-900 text-white font-medium'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {rng}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top 3 KPI Stat Cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-3 sm:p-4">
                    <p className="truncate text-[11px] text-slate-500 sm:text-xs">Visits</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 tabular-nums sm:text-2xl">
                      {visitsValue.toLocaleString()}
                    </p>
                    <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-teal-600 sm:text-[11px] font-medium">
                      <TrendingUp className="h-3 w-3" />
                      +8.2%
                    </p>
                  </div>

                  <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-3 sm:p-4">
                    <p className="truncate text-[11px] text-slate-500 sm:text-xs">Returning</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 tabular-nums sm:text-2xl">
                      {returningValue}%
                    </p>
                    <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-teal-600 sm:text-[11px] font-medium">
                      <TrendingUp className="h-3 w-3" />
                      +3.1 pts
                    </p>
                  </div>

                  <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-3 sm:p-4">
                    <p className="truncate text-[11px] text-slate-500 sm:text-xs">Feedback done</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 tabular-nums sm:text-2xl">
                      {feedbackValue}%
                    </p>
                    <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-teal-600 sm:text-[11px] font-medium">
                      <TrendingUp className="h-3 w-3" />
                      +1.4 pts
                    </p>
                  </div>
                </div>

                {/* Middle Grid: Stacked Bars & Discovery Channels */}
                <div className="grid min-w-0 gap-3 md:grid-cols-5">
                  {/* Left: Visits New vs Returning Stacked Bars */}
                  <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 md:col-span-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-slate-900">Visits · new vs returning</p>
                      <div className="flex gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-xs bg-blue-600" />
                          Returning
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-xs bg-indigo-200" />
                          New
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex h-28 items-end gap-3 sm:gap-4 px-2">
                      {activeRangeData.bars.map((barHeight, idx) => {
                        const returningHeight = Math.round(barHeight * 0.6)
                        const newHeight = barHeight - returningHeight
                        return (
                          <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                            <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-50">
                              <div 
                                className="w-full bg-indigo-200 transition-all duration-500" 
                                style={{ height: `${Math.min(newHeight, 35)}px` }} 
                              />
                              <div 
                                className="w-full bg-blue-600 transition-all duration-500" 
                                style={{ height: `${Math.min(returningHeight, 70)}px` }} 
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right: How Customers Found You Multi-Segment Bar */}
                  <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 md:col-span-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">How customers found you</p>
                      
                      {/* Segmented Bar */}
                      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        {DISCOVERY_CHANNELS.map((item) => (
                          <div
                            key={item.label}
                            className={`${item.color} h-full`}
                            style={{ width: `${item.pct}%` }}
                            title={`${item.label} (${item.pct}%)`}
                          />
                        ))}
                      </div>

                      {/* Channel Legend */}
                      <ul className="mt-3.5 space-y-2 text-[12px]">
                        {DISCOVERY_CHANNELS.map((ch) => (
                          <li key={ch.label} className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600">
                              <span className={`h-2 w-2 rounded-full ${ch.color}`} />
                              {ch.label}
                            </span>
                            <span className="font-mono text-slate-700">{ch.pct}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bottom Grid: Popular Services & Recent Activity */}
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {/* Left: Popular Services */}
                  <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4">
                    <p className="text-[13px] font-medium text-slate-900">Popular services</p>
                    <div className="mt-3 space-y-2.5">
                      {POPULAR_SERVICES.map((srv) => (
                        <div key={srv.name} className="space-y-1">
                          <div className="flex justify-between text-[12px]">
                            <span className="text-slate-700">{srv.name}</span>
                            <span className="font-mono text-slate-500">{srv.count}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-teal-600 transition-all duration-500" 
                              style={{ width: `${srv.pct}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Recent Activity */}
                  <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4">
                    <p className="text-[13px] font-medium text-slate-900">Recent activity</p>
                    <ul className="mt-2.5 divide-y divide-slate-100">
                      {RECENT_ACTIVITIES.map((act) => (
                        <li key={act.who} className="flex items-center gap-2.5 py-2">
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold border ${act.tone}`}>
                            {act.avatar}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium text-slate-800">
                              <span className="font-semibold text-slate-900">{act.who}</span>{' '}
                              <span className="text-slate-500">{act.what}</span>
                            </p>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {act.when}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[12px] text-slate-500">
            Interactive preview with illustrative sample data — try the business selector and date range.
          </p>
        </div>

      </div>
    </section>
  )
}
