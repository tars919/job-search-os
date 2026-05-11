'use client'

import { startTransition, useEffect, useState } from 'react'
import {
  DISCOVERY_SOURCES,
  DISCOVERY_SOURCE_LABELS,
  WORK_MODES,
  type JobDiscovery,
  type DiscoverySource,
  type WorkMode,
} from '@/lib/types'

type DiscoveryDraft = Omit<JobDiscovery, 'id' | 'createdAt' | 'updatedAt'>

const BLANK: DiscoveryDraft = {
  title: '',
  company: '',
  location: '',
  workMode: undefined,
  salaryRange: '',
  source: 'manual',
  sourceUrl: '',
  description: '',
  requiredSkills: [],
  postedDate: '',
  deadline: '',
  fitScore: undefined,
  fitWhy: [],
  missingSkills: [],
  saved: false,
  applied: false,
  rejected: false,
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: DiscoveryDraft) => void
  initialData?: JobDiscovery | null
}

export function DiscoverModal({ isOpen, onClose, onSave, initialData }: Props) {
  const [form, setForm] = useState<DiscoveryDraft>(BLANK)
  const [skillsInput, setSkillsInput] = useState('')

  useEffect(() => {
    if (!isOpen) return
    startTransition(() => {
      if (initialData) {
        setForm({
          title: initialData.title,
          company: initialData.company,
          location: initialData.location ?? '',
          workMode: initialData.workMode,
          salaryRange: initialData.salaryRange ?? '',
          source: initialData.source,
          sourceUrl: initialData.sourceUrl ?? '',
          description: initialData.description ?? '',
          requiredSkills: initialData.requiredSkills,
          postedDate: initialData.postedDate ?? '',
          deadline: initialData.deadline ?? '',
          fitScore: initialData.fitScore,
          fitWhy: initialData.fitWhy ?? [],
          missingSkills: initialData.missingSkills ?? [],
          saved: initialData.saved,
          applied: initialData.applied,
          rejected: initialData.rejected,
        })
        setSkillsInput((initialData.requiredSkills ?? []).join(', '))
      } else {
        setForm(BLANK)
        setSkillsInput('')
      }
    })
  }, [isOpen, initialData])

  function set<K extends keyof DiscoveryDraft>(key: K, value: DiscoveryDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    onSave({ ...form, requiredSkills: skills, location: form.location || undefined, salaryRange: form.salaryRange || undefined, sourceUrl: form.sourceUrl || undefined, description: form.description || undefined, postedDate: form.postedDate || undefined, deadline: form.deadline || undefined })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">
            {initialData ? 'Edit Discovery' : 'Add Job to Discover'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded-md hover:bg-zinc-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Product Manager"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Source + Work Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => set('source', e.target.value as DiscoverySource)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {DISCOVERY_SOURCES.map((s) => (
                  <option key={s} value={s}>{DISCOVERY_SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Work Mode</label>
              <select
                value={form.workMode ?? ''}
                onChange={(e) => set('workMode', (e.target.value || undefined) as WorkMode | undefined)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Not specified</option>
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location + Salary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Location</label>
              <input
                value={form.location ?? ''}
                onChange={(e) => set('location', e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Salary Range</label>
              <input
                value={form.salaryRange ?? ''}
                onChange={(e) => set('salaryRange', e.target.value)}
                placeholder="$120k – $160k"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Job Posting URL</label>
            <input
              type="url"
              value={form.sourceUrl ?? ''}
              onChange={(e) => set('sourceUrl', e.target.value)}
              placeholder="https://linkedin.com/jobs/..."
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Posted + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Posted Date</label>
              <input
                type="date"
                value={form.postedDate ?? ''}
                onChange={(e) => set('postedDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline ?? ''}
                onChange={(e) => set('deadline', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Required Skills</label>
            <input
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="SQL, Python, Product Strategy, A/B Testing"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-[10px] text-zinc-400">Comma-separated. Used for AI fit scoring.</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Job Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Paste the full job description here for better AI fit scoring…"
              rows={5}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            form=""
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            {initialData ? 'Save Changes' : 'Add Job'}
          </button>
        </div>
      </div>
    </div>
  )
}
