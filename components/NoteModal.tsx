'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import type { Job, ResearchNote } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

interface FormState {
  company: string
  jobId: string
  content: string
}

const EMPTY: FormState = { company: '', jobId: '', content: '' }

const inputCls = (err: boolean) =>
  `w-full rounded-lg border ${
    err ? 'border-red-300 bg-red-50/50' : 'border-zinc-200 bg-white'
  } px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="block text-xs font-medium text-zinc-500">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </label>
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialData?: ResearchNote | null
  jobs: Job[]
  companySuggestions: string[]
}

export function NoteModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  jobs,
  companySuggestions,
}: NoteModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const companyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    startTransition(() => {
      setForm(
        initialData
          ? { company: initialData.company, jobId: initialData.jobId ?? '', content: initialData.content }
          : EMPTY,
      )
      setErrors({})
    })
  }, [isOpen, initialData])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => companyRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [isOpen])

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleJobSelect(jobId: string) {
    set('jobId', jobId)
    if (!form.company.trim() && jobId) {
      const job = jobs.find((j) => j.id === jobId)
      if (job) set('company', job.company)
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.company.trim()) errs.company = 'Required'
    if (!form.content.trim()) errs.content = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      company: form.company.trim(),
      jobId: form.jobId || undefined,
      content: form.content.trim(),
    })
    onClose()
  }

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={isOpen ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div
        className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-all duration-200 ${isOpen ? 'scale-100 translate-y-0' : 'scale-[0.97] translate-y-1'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 shrink-0">
          <h2 className="text-base font-semibold text-zinc-900">
            {initialData ? 'Edit Note' : 'New Research Note'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company" required error={errors.company}>
              <input
                ref={companyRef}
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Stripe"
                list="note-companies"
                className={inputCls(!!errors.company)}
              />
              <datalist id="note-companies">
                {companySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>

            <Field label="Linked Application" hint="optional">
              <select
                value={form.jobId}
                onChange={(e) => handleJobSelect(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">None</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.company} — {j.role} ({STATUS_LABELS[j.status]})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Notes"
            required
            error={errors.content}
            hint="## headings  **bold**  - lists"
          >
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder={`## Company Research\n\n**Mission:** ...\n\n**Tech stack:** ...\n\n- Key talking point\n- Key talking point`}
              rows={14}
              className={`${inputCls(!!errors.content)} resize-y font-mono text-xs leading-relaxed`}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50/60 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            {initialData ? 'Save Changes' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
