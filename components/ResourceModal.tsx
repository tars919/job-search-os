'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS, type Resource, type ResourceType } from '@/lib/types'

interface FormState {
  title: string
  type: ResourceType
  company: string
  role: string
  tags: string
  sourceUrl: string
  contentText: string
  notes: string
  fileName: string
  fileType: string
  fileSize: number | undefined
}

const EMPTY: FormState = {
  title: '',
  type: 'resume',
  company: '',
  role: '',
  tags: '',
  sourceUrl: '',
  contentText: '',
  notes: '',
  fileName: '',
  fileType: '',
  fileSize: undefined,
}

function resourceToForm(r: Resource): FormState {
  return {
    title: r.title,
    type: r.type,
    company: r.company ?? '',
    role: r.role ?? '',
    tags: r.tags.join(', '),
    sourceUrl: r.sourceUrl ?? '',
    contentText: r.contentText ?? '',
    notes: r.notes ?? '',
    fileName: r.fileName ?? '',
    fileType: r.fileType ?? '',
    fileSize: r.fileSize,
  }
}

const inputCls = (err?: boolean) =>
  `w-full rounded-lg border ${err ? 'border-red-300 bg-red-50/50' : 'border-zinc-200 bg-white'} px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`

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

export interface ResourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialData?: Resource | null
}

export function ResourceModal({ isOpen, onClose, onSave, initialData }: ResourceModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    startTransition(() => {
      setForm(initialData ? resourceToForm(initialData) : EMPTY)
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
    const timer = setTimeout(() => titleRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [isOpen])

  function set(key: keyof FormState, value: string | number | undefined) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleFile(file: File) {
    set('fileName', file.name)
    set('fileType', file.type)
    set('fileSize', file.size)

    const isText = file.type === 'text/plain' || file.type === 'text/csv' ||
      file.name.endsWith('.txt') || file.name.endsWith('.csv')

    if (isText) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text && !form.contentText) set('contentText', text)
      }
      reader.readAsText(file)
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.title.trim()) errs.title = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onSave({
      title: form.title.trim(),
      type: form.type,
      company: form.company.trim() || undefined,
      role: form.role.trim() || undefined,
      tags,
      sourceUrl: form.sourceUrl.trim() || undefined,
      contentText: form.contentText.trim() || undefined,
      notes: form.notes.trim() || undefined,
      fileName: form.fileName || undefined,
      fileType: form.fileType || undefined,
      fileSize: form.fileSize,
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
            {initialData ? 'Edit Resource' : 'New Resource'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Title + Type */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" required error={errors.title}>
              <input
                ref={titleRef}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Software Engineer Resume"
                className={inputCls(!!errors.title)}
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value as ResourceType)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{RESOURCE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Company + Role */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company" hint="optional">
              <input
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Stripe"
                className={inputCls()}
              />
            </Field>
            <Field label="Role" hint="optional">
              <input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Software Engineer"
                className={inputCls()}
              />
            </Field>
          </div>

          {/* Tags */}
          <Field label="Tags" hint="comma-separated">
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="v2, tailored, 2026"
              className={inputCls()}
            />
          </Field>

          {/* Source URL */}
          <Field label="Source URL" hint="optional">
            <input
              value={form.sourceUrl}
              onChange={(e) => set('sourceUrl', e.target.value)}
              placeholder="https://docs.google.com/…"
              className={inputCls()}
            />
          </Field>

          {/* File upload */}
          <Field label="File" hint="PDF, DOCX, TXT, CSV — text extracted for TXT/CSV">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose file
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </label>
              {form.fileName && (
                <span className="text-xs text-zinc-500 truncate max-w-[240px]">
                  {form.fileName}
                  {form.fileSize != null && (
                    <span className="ml-1 text-zinc-400">
                      ({(form.fileSize / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </span>
              )}
            </div>
          </Field>

          {/* Content text */}
          <Field label="Content Text" hint="paste or auto-extracted from TXT/CSV">
            <textarea
              value={form.contentText}
              onChange={(e) => set('contentText', e.target.value)}
              placeholder="Paste your resume, cover letter, or job description text here…"
              rows={8}
              className={`${inputCls()} resize-y font-mono text-xs leading-relaxed`}
            />
          </Field>

          {/* Notes */}
          <Field label="Notes" hint="optional">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Tailored for fintech roles, v3 with updated projects section…"
              rows={3}
              className={`${inputCls()} resize-none`}
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
            {initialData ? 'Save Changes' : 'Add Resource'}
          </button>
        </div>
      </div>
    </div>
  )
}
