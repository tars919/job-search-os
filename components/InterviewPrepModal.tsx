'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import {
  ROUND_TYPES,
  ROUND_TYPE_LABELS,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  type InterviewPrep,
  type InterviewStatus,
  type RoundType,
  type Job,
} from '@/lib/types'

interface FormState {
  company: string
  role: string
  relatedJobId: string
  roundName: string
  roundType: RoundType
  interviewDate: string
  interviewerName: string
  interviewerRole: string
  status: InterviewStatus
  prepNotes: string
  questionsToPractice: string
  storiesToUse: string
  feedback: string
}

const EMPTY: FormState = {
  company: '',
  role: '',
  relatedJobId: '',
  roundName: '',
  roundType: 'behavioral',
  interviewDate: '',
  interviewerName: '',
  interviewerRole: '',
  status: 'upcoming',
  prepNotes: '',
  questionsToPractice: '',
  storiesToUse: '',
  feedback: '',
}

function prepToForm(iv: InterviewPrep): FormState {
  return {
    company: iv.company,
    role: iv.role ?? '',
    relatedJobId: iv.relatedJobId ?? '',
    roundName: iv.roundName,
    roundType: iv.roundType,
    interviewDate: iv.interviewDate ?? '',
    interviewerName: iv.interviewerName ?? '',
    interviewerRole: iv.interviewerRole ?? '',
    status: iv.status,
    prepNotes: iv.prepNotes ?? '',
    questionsToPractice: iv.questionsToPractice ?? '',
    storiesToUse: iv.storiesToUse ?? '',
    feedback: iv.feedback ?? '',
  }
}

interface InterviewPrepModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<InterviewPrep, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialData?: InterviewPrep | null
  jobs: Job[]
}

export function InterviewPrepModal({ isOpen, onClose, onSave, initialData, jobs }: InterviewPrepModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const companyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    startTransition(() => {
      setForm(initialData ? prepToForm(initialData) : EMPTY)
      setErrors({})
    })
  }, [isOpen, initialData])

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => companyRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // When a linked job is selected, auto-fill company/role if empty
  function handleJobLink(jobId: string) {
    set('relatedJobId', jobId)
    if (jobId) {
      const job = jobs.find((j) => j.id === jobId)
      if (job) {
        setForm((f) => ({
          ...f,
          relatedJobId: jobId,
          company: f.company || job.company,
          role: f.role || job.role,
        }))
      }
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.company.trim()) errs.company = 'Required'
    if (!form.roundName.trim()) errs.roundName = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSave({
      company: form.company.trim(),
      role: form.role.trim() || undefined,
      relatedJobId: form.relatedJobId || undefined,
      roundName: form.roundName.trim(),
      roundType: form.roundType,
      interviewDate: form.interviewDate || undefined,
      interviewerName: form.interviewerName.trim() || undefined,
      interviewerRole: form.interviewerRole.trim() || undefined,
      status: form.status,
      prepNotes: form.prepNotes.trim() || undefined,
      questionsToPractice: form.questionsToPractice.trim() || undefined,
      storiesToUse: form.storiesToUse.trim() || undefined,
      feedback: form.feedback.trim() || undefined,
    })
  }

  if (!isOpen) return null

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'
  const label = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-zinc-900">
            {initialData ? 'Edit Interview' : 'Add Interview'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Row 1: company + role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Company *</label>
              <input
                ref={companyRef}
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                list="interview-company-suggestions"
                placeholder="Google"
                className={`${field} ${errors.company ? 'border-red-300' : ''}`}
              />
              <datalist id="interview-company-suggestions">
                {[...new Set(jobs.map((j) => j.company))].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.company && <p className="mt-1 text-xs text-red-500">{errors.company}</p>}
            </div>
            <div>
              <label className={label}>Role</label>
              <input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Product Manager"
                className={field}
              />
            </div>
          </div>

          {/* Row 2: round name + round type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Round Name *</label>
              <input
                value={form.roundName}
                onChange={(e) => set('roundName', e.target.value)}
                placeholder="Round 1 — Behavioral"
                className={`${field} ${errors.roundName ? 'border-red-300' : ''}`}
              />
              {errors.roundName && <p className="mt-1 text-xs text-red-500">{errors.roundName}</p>}
            </div>
            <div>
              <label className={label}>Round Type</label>
              <select
                value={form.roundType}
                onChange={(e) => set('roundType', e.target.value as RoundType)}
                className={`${field} bg-white`}
              >
                {ROUND_TYPES.map((r) => (
                  <option key={r} value={r}>{ROUND_TYPE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: status + interview date + linked job */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as InterviewStatus)}
                className={`${field} bg-white`}
              >
                {INTERVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>{INTERVIEW_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Interview Date</label>
              <input
                type="date"
                value={form.interviewDate}
                onChange={(e) => set('interviewDate', e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Linked Job</label>
              <select
                value={form.relatedJobId}
                onChange={(e) => handleJobLink(e.target.value)}
                className={`${field} bg-white`}
              >
                <option value="">None</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.company} — {j.role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: interviewer name + role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Interviewer Name</label>
              <input
                value={form.interviewerName}
                onChange={(e) => set('interviewerName', e.target.value)}
                placeholder="Alex Chen"
                className={field}
              />
            </div>
            <div>
              <label className={label}>Interviewer Role</label>
              <input
                value={form.interviewerRole}
                onChange={(e) => set('interviewerRole', e.target.value)}
                placeholder="Senior PM"
                className={field}
              />
            </div>
          </div>

          {/* Prep notes */}
          <div>
            <label className={label}>Prep Notes</label>
            <textarea
              value={form.prepNotes}
              onChange={(e) => set('prepNotes', e.target.value)}
              rows={3}
              placeholder="Key topics to cover, company context, things to remember..."
              className={`${field} resize-none`}
            />
          </div>

          {/* Questions to practice */}
          <div>
            <label className={label}>Questions to Practice</label>
            <textarea
              value={form.questionsToPractice}
              onChange={(e) => set('questionsToPractice', e.target.value)}
              rows={3}
              placeholder="Tell me about a time you influenced without authority. Walk me through a product you've built..."
              className={`${field} resize-none`}
            />
          </div>

          {/* Stories to use */}
          <div>
            <label className={label}>Stories / STAR Examples</label>
            <textarea
              value={form.storiesToUse}
              onChange={(e) => set('storiesToUse', e.target.value)}
              rows={3}
              placeholder="Leadership story: launched X feature… Conflict story: disagreement with eng lead on Y..."
              className={`${field} resize-none`}
            />
          </div>

          {/* Feedback (post-interview) */}
          <div>
            <label className={label}>Feedback / Notes After</label>
            <textarea
              value={form.feedback}
              onChange={(e) => set('feedback', e.target.value)}
              rows={2}
              placeholder="How it went, what to improve next time..."
              className={`${field} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {initialData ? 'Save Changes' : 'Add Interview'}
          </button>
        </div>
      </div>
    </div>
  )
}
