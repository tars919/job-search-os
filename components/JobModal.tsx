'use client'

import { useEffect, useRef, useState } from 'react'
import { JOB_STATUSES, STATUS_LABELS, PRIORITIES, PRIORITY_LABELS } from '@/lib/types'
import type { Job, JobStatus, Priority } from '@/lib/types'

interface FormState {
  company: string
  role: string
  location: string
  salaryRange: string
  status: JobStatus
  priority: Priority
  url: string
  savedAt: string
  appliedAt: string
  deadline: string
  notes: string
}

const EMPTY_FORM: FormState = {
  company: '',
  role: '',
  location: '',
  salaryRange: '',
  status: 'saved',
  priority: 'medium',
  url: '',
  savedAt: '',
  appliedAt: '',
  deadline: '',
  notes: '',
}

function jobToForm(job: Job): FormState {
  return {
    company: job.company,
    role: job.role,
    location: job.location ?? '',
    salaryRange: job.salaryRange ?? '',
    status: job.status,
    priority: job.priority ?? 'medium',
    url: job.url ?? '',
    savedAt: job.savedAt ?? job.createdAt.slice(0, 10),
    appliedAt: job.appliedAt ?? '',
    deadline: job.deadline ?? '',
    notes: job.notes ?? '',
  }
}

const input =
  (err: boolean) =>
    `w-full rounded-lg border ${err ? 'border-red-300 bg-red-50/50' : 'border-zinc-200 bg-white'} px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`

const select =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-500">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export interface JobModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialData?: Job | null
}

export function JobModal({ isOpen, onClose, onSave, initialData }: JobModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setForm(
      initialData
        ? jobToForm(initialData)
        : { ...EMPTY_FORM, savedAt: new Date().toISOString().slice(0, 10) },
    )
    setErrors({})
  }, [isOpen, initialData])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => firstInputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [isOpen])

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.company.trim()) errs.company = 'Required'
    if (!form.role.trim()) errs.role = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      company: form.company.trim(),
      role: form.role.trim(),
      status: form.status,
      priority: form.priority,
      location: form.location.trim() || undefined,
      salaryRange: form.salaryRange.trim() || undefined,
      url: form.url.trim() || undefined,
      savedAt: form.savedAt || undefined,
      appliedAt: form.appliedAt || undefined,
      deadline: form.deadline || undefined,
      notes: form.notes.trim() || undefined,
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
            {initialData ? 'Edit Application' : 'Add Application'}
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
          {/* Company + Role */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company" required error={errors.company}>
              <input
                ref={firstInputRef}
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Stripe"
                className={input(!!errors.company)}
              />
            </Field>
            <Field label="Role" required error={errors.role}>
              <input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Software Engineer"
                className={input(!!errors.role)}
              />
            </Field>
          </div>

          {/* Location + Salary */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location">
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Remote"
                className={input(false)}
              />
            </Field>
            <Field label="Salary Range">
              <input
                value={form.salaryRange}
                onChange={(e) => set('salaryRange', e.target.value)}
                placeholder="$120k–$160k"
                className={input(false)}
              />
            </Field>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as JobStatus)}
                className={select}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as Priority)}
                className={select}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Source URL */}
          <Field label="Source URL">
            <input
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://company.com/jobs/role-id"
              className={input(false)}
            />
          </Field>

          {/* Date Saved + Date Applied */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date Saved">
              <input
                type="date"
                value={form.savedAt}
                onChange={(e) => set('savedAt', e.target.value)}
                className={input(false)}
              />
            </Field>
            <Field label="Date Applied">
              <input
                type="date"
                value={form.appliedAt}
                onChange={(e) => set('appliedAt', e.target.value)}
                className={input(false)}
              />
            </Field>
          </div>

          {/* Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Deadline">
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set('deadline', e.target.value)}
                className={input(false)}
              />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Interview prep, contacts, links, salary details..."
              rows={3}
              className={`${input(false)} resize-none`}
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
            {initialData ? 'Save Changes' : 'Add Application'}
          </button>
        </div>
      </div>
    </div>
  )
}
