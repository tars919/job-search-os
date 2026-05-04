'use client'

import { useEffect, useRef, useState } from 'react'
import type { PromptEntry } from '@/lib/types'

interface FormState {
  title: string
  category: string
  body: string
}

const EMPTY: FormState = { title: '', category: '', body: '' }

const inputCls = (err: boolean) =>
  `w-full rounded-lg border ${err ? 'border-red-300 bg-red-50/50' : 'border-zinc-200 bg-white'} px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`

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

export interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<PromptEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialData?: PromptEntry | null
  existingCategories: string[]
}

export function PromptModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingCategories,
}: PromptModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setForm(
      initialData
        ? { title: initialData.title, category: initialData.category, body: initialData.body }
        : EMPTY,
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
    if (isOpen) setTimeout(() => titleRef.current?.focus(), 50)
  }, [isOpen])

  if (!isOpen) return null

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.title.trim()) errs.title = 'Required'
    if (!form.category.trim()) errs.category = 'Required'
    if (!form.body.trim()) errs.body = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      title: form.title.trim(),
      category: form.category.trim(),
      body: form.body.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 shrink-0">
          <h2 className="text-base font-semibold text-zinc-900">
            {initialData ? 'Edit Prompt' : 'New Prompt'}
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
          <Field label="Title" required error={errors.title}>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Cold Email to Recruiter"
              className={inputCls(!!errors.title)}
            />
          </Field>

          <Field label="Category" required error={errors.category}>
            <input
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="Outreach"
              list="prompt-categories"
              className={inputCls(!!errors.category)}
            />
            <datalist id="prompt-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Prompt Body" required error={errors.body}>
            <textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Write your template here. Use [brackets] for placeholders."
              rows={10}
              className={`${inputCls(!!errors.body)} resize-y font-mono text-xs leading-relaxed`}
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
            {initialData ? 'Save Changes' : 'Add Prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}
