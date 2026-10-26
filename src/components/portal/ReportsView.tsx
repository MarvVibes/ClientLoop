// ====================================================================
// CLIENTLOOP EXECUTIVE PERFORMANCE REPORTS VIEW
// Period-over-Period Performance Analytics • Weekly & Monthly Reports
// Print-Ready • Rule-Based Recommendations • Transparent Attribution
// ====================================================================

import React, { useState, useMemo } from 'react'
import { 
  FileSpreadsheet, 
  Calendar, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Star, 
  ExternalLink, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  HelpCircle,
  Compass,
  Scissors,
  ShieldCheck
} from 'lucide-react'
import { Business } from '../../lib/types/database'
import { 
  generatePerformanceReport, 
  ReportPeriodType, 
  PerformanceReport 
} from '../../lib/reports/reportGenerator'
import { triggerCsvDownload, buildCsvString } from '../../lib/export/csvExport'

interface ReportsViewProps {
  business: Business
}

export const ReportsView: React.FC<ReportsViewProps> = ({ business }) => {
  const [periodType, setPeriodType] = useState<ReportPeriodType>('week')
  const [offsetPeriods, setOffsetPeriods] = useState<number>(0) // 0 = current, 1 = previous

  // Calculate reference date based on offset
  const referenceDate = useMemo(() => {
    const d = new Date()
    if (periodType === 'week') {
      d.setDate(d.getDate() - offsetPeriods * 7)
    } else {
      d.setMonth(d.getMonth() - offsetPeriods)
    }
    return d
  }, [periodType, offsetPeriods])

  // Generate report data from actual database/store records
  const report: PerformanceReport = useMemo(() => {
    return generatePerformanceReport(business.id, periodType, referenceDate)
  }, [business.id, periodType, referenceDate])

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const handleExportReportCsv = () => {
    const headers = ['Metric Section', 'Metric Name', 'Current Period', 'Prior Period', 'Period Change (%)']
    const rows: (string | number)[][] = [
      ['Customer Growth', 'Total Visits', report.visits.current, report.visits.previous, report.visits.changePercent ?? 'N/A'],
      ['Customer Growth', 'Unique Clients Active', report.uniqueCustomers.current, report.uniqueCustomers.previous, report.uniqueCustomers.changePercent ?? 'N/A'],
      ['Customer Growth', 'New Customers Acquired', report.newCustomersAcquired.current, report.newCustomersAcquired.previous, report.newCustomersAcquired.changePercent ?? 'N/A'],
      ['Customer Growth', 'Returning Client Visits', report.returningCustomers.current, report.returningCustomers.previous, report.returningCustomers.changePercent ?? 'N/A'],
      ['Customer Growth', 'New Customer Rate (%)', `${report.newCustomerPercentage}%`, 'N/A', 'N/A'],
      ['Questionnaire Flow', 'Invitations Created', report.invitationsCreated.current, report.invitationsCreated.previous, report.invitationsCreated.changePercent ?? 'N/A'],
      ['Questionnaire Flow', 'Completed Submissions', report.questionnairesCompleted.current, report.questionnairesCompleted.previous, report.questionnairesCompleted.changePercent ?? 'N/A'],
      ['Questionnaire Flow', 'Completion Rate (%)', `${report.completionRate.current}%`, `${report.completionRate.previous}%`, report.completionRate.changePercent ?? 'N/A'],
      ['Google Reviews', 'Review Invitations Shown', report.reviewInvitationsShown.current, report.reviewInvitationsShown.previous, report.reviewInvitationsShown.changePercent ?? 'N/A'],
      ['Google Reviews', 'Outbound Review Clicks', report.reviewClicks.current, report.reviewClicks.previous, report.reviewClicks.changePercent ?? 'N/A'],
      ['Google Reviews', 'Review Click-Through Rate (%)', `${report.reviewClickThroughRate.current}%`, `${report.reviewClickThroughRate.previous}%`, report.reviewClickThroughRate.changePercent ?? 'N/A'],
    ]

    // Append top acquisition sources
    for (const src of report.acquisitionBreakdown) {
      rows.push(['Acquisition Source', src.source, src.count, src.previousCount, `${src.percentage}% of known`])
    }

    const csvContent = buildCsvString(headers, rows)
    const slug = business.slug || business.id
    const filename = `${slug}_${periodType}_report_${new Date().toISOString().split('T')[0]}.csv`
    triggerCsvDownload(filename, csvContent)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Top Controls Bar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Executive Performance Report
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {business.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>{report.dateBoundary.label}</span>
            <span>•</span>
            <span className="font-mono text-slate-400">Timezone: {report.timezone}</span>
          </p>
        </div>

        {/* Period Selector & Print / Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Week vs Month Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => { setPeriodType('week'); setOffsetPeriods(0) }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                periodType === 'week' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => { setPeriodType('month'); setOffsetPeriods(0) }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                periodType === 'month' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Current vs Prior Period Toggle */}
          <select
            value={offsetPeriods}
            onChange={(e) => setOffsetPeriods(Number(e.target.value))}
            className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value={0}>Current {periodType === 'week' ? 'Week' : 'Month'}</option>
            <option value={1}>Previous {periodType === 'week' ? 'Week' : 'Month'}</option>
            <option value={2}>2 {periodType === 'week' ? 'Weeks' : 'Months'} Ago</option>
          </select>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print report layout"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportReportCsv}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download CSV Summary"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV Export</span>
          </button>
        </div>
      </div>

      {/* 1. Customer Growth & Retention KPIs */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          1. Customer Growth & Retention
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card: Total Visits */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Recorded Visits</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{report.visits.current}</span>
              {report.visits.changePercent !== null && (
                <span className={`text-xs font-bold flex items-center ${
                  report.visits.isIncrease ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {report.visits.isIncrease ? '+' : ''}{report.visits.changePercent}%
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">vs {report.visits.previous} prior period</span>
          </div>

          {/* Card: Unique Clients */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Active Unique Clients</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{report.uniqueCustomers.current}</span>
              {report.uniqueCustomers.changePercent !== null && (
                <span className={`text-xs font-bold flex items-center ${
                  report.uniqueCustomers.isIncrease ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {report.uniqueCustomers.isIncrease ? '+' : ''}{report.uniqueCustomers.changePercent}%
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">vs {report.uniqueCustomers.previous} prior period</span>
          </div>

          {/* Card: New Customers Acquired */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">New Clients Acquired</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-700">{report.newCustomersAcquired.current}</span>
              <span className="text-[11px] font-semibold text-slate-500">
                ({report.newCustomerPercentage}% of active)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">vs {report.newCustomersAcquired.previous} prior period</span>
          </div>

          {/* Card: Returning Client Visits */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Returning Client Visits</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-700">{report.returningCustomers.current}</span>
              <span className="text-[11px] font-semibold text-slate-500">
                ({report.repeatCustomerPercentage}% repeat)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">vs {report.returningCustomers.previous} prior period</span>
          </div>

        </div>
      </div>

      {/* 2. Marketing Attribution & Discovery Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Discovery Breakdown (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Customer Discovery & Marketing Attribution</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Self-reported on 60-second client questionnaires
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {report.knownSourcePercentage}% Known
            </span>
          </div>

          {report.acquisitionBreakdown.length > 0 ? (
            <div className="space-y-3 pt-2">
              {report.acquisitionBreakdown.map((item) => (
                <div key={item.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.source}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900">{item.count} clients</span>
                      <span className="text-slate-400 text-[11px]">({item.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${Math.max(5, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No new client acquisition sources recorded during this reporting window.
            </div>
          )}

          {report.unknownSourceCount > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
              Notice: <strong>{report.unknownSourceCount} active clients</strong> have unrecorded discovery sources. Send the quick WhatsApp questionnaire after visits to capture this data.
            </p>
          )}
        </div>

        {/* Top Channel Callout & Popular Services (1 col) */}
        <div className="space-y-6">

          {/* Top Acquisition Channel */}
          <div className="p-5 rounded-3xl bg-linear-to-br from-blue-900 to-indigo-950 text-white shadow-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
              #1 Customer Acquisition Channel
            </span>
            <h4 className="text-lg font-bold text-white">
              {report.topAcquisitionSource || 'Pending Questionnaire Responses'}
            </h4>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              {report.topAcquisitionSource
                ? `Leading touchpoint driving new clientele to ${business.name} during this period.`
                : 'Customer touchpoint data will appear as clients submit questionnaires.'}
            </p>
          </div>

          {/* Popular Services */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-slate-400" />
              <span>Service Distribution</span>
            </h4>
            <div className="space-y-2 text-xs">
              {report.servicesBreakdown.slice(0, 4).map((srv) => (
                <div key={srv.name} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 truncate pr-2">{srv.name}</span>
                  <span className="font-bold text-slate-900 shrink-0 font-mono">{srv.count} ({srv.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 3. Feedback, Ratings & Google Reviews Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Feedback & Satisfaction */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Customer Feedback & Satisfaction</span>
            </h4>
            {report.averageRating && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                {report.averageRating} ★ Average
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block">Sent</span>
              <span className="text-lg font-bold text-slate-900">{report.invitationsCreated.current}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block">Completed</span>
              <span className="text-lg font-bold text-emerald-700">{report.questionnairesCompleted.current}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block">Completion %</span>
              <span className="text-lg font-bold text-blue-700">{report.completionRate.current}%</span>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-slate-800 block">Recent Verified Comments</span>
            {report.feedbackComments.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {report.feedbackComments.map((comment, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-800">{comment.customerName}</span>
                      <span>{comment.service} • {comment.rating ? `${comment.rating}★` : ''}</span>
                    </div>
                    <p className="text-slate-700 italic">"{comment.text}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                No free-form text feedback submitted during this window.
              </p>
            )}
          </div>
        </div>

        {/* Google Reviews Activity */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span>Google Review Invitation Analytics</span>
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              report.isGoogleReviewConfigured
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {report.isGoogleReviewConfigured ? 'Review Link Active' : 'Not Configured'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block">Invitations Shown</span>
              <span className="text-lg font-bold text-slate-900">{report.reviewInvitationsShown.current}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block">Outbound Clicks</span>
              <span className="text-lg font-bold text-blue-700">{report.reviewClicks.current}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block">Click-Through Rate</span>
              <span className="text-lg font-bold text-emerald-700">{report.reviewClickThroughRate.current}%</span>
            </div>
          </div>

          {/* Compliance & Tracking Guarantee Notice */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Honest Metric Separation</span>
            </p>
            <p className="text-[10px] text-slate-500 leading-normal">
              ClientLoop records actual customer taps to the Google review URL. Google Maps does not notify third-party platforms when a review is published. Clicks are presented accurately as invitation engagement, never fabricated as verified Google reviews.
            </p>
          </div>

          {report.reviewUrl && (
            <div className="text-xs flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/60">
              <span className="text-slate-600 truncate max-w-xs">{report.reviewUrl}</span>
              <a 
                href={report.reviewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 font-bold hover:underline shrink-0 flex items-center gap-1"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

      </div>

      {/* 4. Rule-Based Transparent Recommendations */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Actionable Business Recommendations
          </h3>
          <span className="text-[10px] text-slate-400 font-normal">
            (Derived purely from actual operational data)
          </span>
        </div>

        {report.recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {report.recommendations.map((rec) => (
              <div 
                key={rec.id}
                className="p-4 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-xs space-y-2 card-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    rec.priority === 'high' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : rec.priority === 'medium'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {rec.type}
                  </span>
                  <span className="text-[10px] text-slate-400">Rule-based</span>
                </div>
                <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{rec.headline}</h5>
                <p className="text-slate-600 leading-relaxed text-[11px]">{rec.rationale}</p>
                <div className="pt-1.5 border-t border-slate-200/60 text-blue-900 font-semibold text-[11px]">
                  💡 <strong>Action:</strong> {rec.actionableStep}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3">
            No anomalous variances detected for this period. Current operations and retention are trending stably.
          </p>
        )}
      </div>

    </div>
  )
}
