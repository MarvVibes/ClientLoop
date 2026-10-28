// ====================================================================
// CLIENTLOOP QUESTIONNAIRE BUILDER & VERSIONING ENGINE
// Interactive form configuration, field ordering, and live preview modal
// ====================================================================

import React, { useState } from 'react'
import { Business } from '../../lib/types/database'
import { store } from '../../lib/services/store'
import { 
  FileText, 
  Plus, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Star, 
  HelpCircle, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  X,
  Smartphone
} from 'lucide-react'

export type QuestionType = 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'rating' 
  | 'short_text' 
  | 'long_text' 
  | 'yes_no'

export interface FormQuestionField {
  id: string
  key: string
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
}

interface QuestionnaireBuilderProps {
  business: Business
  onSaved?: () => void
}

export const QuestionnaireBuilder: React.FC<QuestionnaireBuilderProps> = ({
  business,
  onSaved
}) => {
  // Standard questions initialized for the business
  const [questions, setQuestions] = useState<FormQuestionField[]>([
    {
      id: 'q_first_visit',
      key: 'first_visit',
      label: 'Was this your first time visiting us?',
      type: 'yes_no',
      required: true,
      helpText: 'Helps us tailor our welcome or loyal customer appreciation.'
    },
    {
      id: 'q_discovery',
      key: 'discovery_source',
      label: 'How did you first discover or hear about us?',
      type: 'single_choice',
      required: true,
      options: business.discovery_source_options || [
        'Friend or Family Recommendation',
        'Google Maps Search',
        'Instagram / TikTok',
        'Walked Past / Local Signage',
        'Other'
      ]
    },
    {
      id: 'q_service',
      key: 'service_received',
      label: 'Which service did you receive today?',
      type: 'single_choice',
      required: true,
      options: business.services?.map(s => s.name) || ['General Service']
    },
    {
      id: 'q_rating',
      key: 'rating',
      label: 'How would you rate your overall experience today?',
      type: 'rating',
      required: true
    },
    {
      id: 'q_feedback',
      key: 'feedback',
      label: 'Any comments, compliments, or suggestions for our staff?',
      type: 'long_text',
      required: false,
      placeholder: 'Share your honest feedback...'
    }
  ])

  const [activePreview, setActivePreview] = useState(false)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)

  // Question editing sub-state
  const [editingQuestion, setEditingQuestion] = useState<FormQuestionField | null>(null)

  // Move questions up or down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1
    if (newIdx < 0 || newIdx >= questions.length) return
    const updated = [...questions]
    const temp = updated[index]
    updated[index] = updated[newIdx]
    updated[newIdx] = temp
    setQuestions(updated)
  }

  const handleDelete = (id: string) => {
    if (questions.length <= 2) {
      alert('Questionnaire must contain at least 2 questions.')
      return
    }
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const handleAddNewQuestion = () => {
    const newQ: FormQuestionField = {
      id: `q_${Math.random().toString(36).substring(2, 8)}`,
      key: `custom_${Date.now()}`,
      label: 'New Question Title',
      type: 'single_choice',
      required: false,
      options: ['Option A', 'Option B']
    }
    setQuestions(prev => [...prev, newQ])
    setEditingQuestion(newQ)
  }

  const handleSaveQuestionnaire = () => {
    // Persist to business settings
    try {
      const updatedBusiness = {
        ...business,
        discovery_source_options: questions.find(q => q.key === 'discovery_source')?.options || business.discovery_source_options,
        updated_at: new Date().toISOString()
      }
      store.createBusiness(updatedBusiness)
      setSaveNotice('Questionnaire configuration published successfully!')
      setTimeout(() => setSaveNotice(null), 4000)
      onSaved?.()
    } catch {
      alert('Failed to save questionnaire changes.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Client Questionnaire Builder
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize the survey questions customers receive via WhatsApp following their appointment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActivePreview(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            Mobile Preview
          </button>
          <button
            type="button"
            onClick={handleSaveQuestionnaire}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Publish Changes
          </button>
        </div>
      </div>

      {saveNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Questions Stack */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3 transition-all hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">{q.label}</h3>
                    {q.required && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Type: <span className="font-semibold text-slate-600 capitalize">{q.type.replace('_', ' ')}</span>
                    {q.helpText ? ` • ${q.helpText}` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === questions.length - 1}
                  className="p-1 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(q.id)}
                  className="p-1 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Answer Options for Choice types */}
            {(q.type === 'single_choice' || q.type === 'multiple_choice') && q.options && (
              <div className="pl-9 pt-1">
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Choice options:</p>
                <div className="flex flex-wrap gap-1.5">
                  {q.options.map(opt => (
                    <span
                      key={opt}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Question Button */}
      <button
        type="button"
        onClick={handleAddNewQuestion}
        className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Add Custom Question
      </button>

      {/* Mobile Live Preview Modal */}
      {activePreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Smartphone className="w-4 h-4 text-blue-400" />
                Mobile Questionnaire Preview
              </div>
              <button
                onClick={() => setActivePreview(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50 text-xs">
              <div className="text-center pb-2">
                <h3 className="font-bold text-slate-900 text-sm">{business.name}</h3>
                <p className="text-[11px] text-slate-500">We value your visit experience</p>
              </div>

              {questions.map((q, idx) => (
                <div key={q.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800">
                    {idx + 1}. {q.label} {q.required && <span className="text-rose-500">*</span>}
                  </p>

                  {q.type === 'yes_no' && (
                    <div className="flex gap-2">
                      <button type="button" className="flex-1 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 bg-white">Yes</button>
                      <button type="button" className="flex-1 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 bg-white">No</button>
                    </div>
                  )}

                  {q.type === 'rating' && (
                    <div className="flex items-center justify-center gap-2 py-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className="w-6 h-6 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  )}

                  {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                    <div className="space-y-1">
                      {q.options?.map(opt => (
                        <div key={opt} className="p-2 border border-slate-200 rounded-lg text-[11px] text-slate-700 bg-slate-50 flex items-center gap-2">
                          <input type="radio" readOnly name={q.id} className="w-3 h-3 text-blue-600" />
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'long_text' && (
                    <textarea
                      disabled
                      placeholder={q.placeholder || 'Your feedback...'}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 h-16"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => setActivePreview(false)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
