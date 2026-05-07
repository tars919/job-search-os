'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import {
  OUTREACH_STATUSES,
  OUTREACH_STATUS_LABELS,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  OUTREACH_CHANNELS,
  OUTREACH_CHANNEL_LABELS,
  type Job,
  type Outreach,
  type OutreachChannel,
  type OutreachStatus,
  type RelationshipType,
} from '@/lib/types'

interface FormState {
  personName: string
  company: string
  role: string
  relationshipType: RelationshipType
  channel: OutreachChannel
  status: OutreachStatus
  relatedJobId: string
  lastContactedAt: string
  followUpDate: string
  notes: string
  messageDraft: string
}

const EMPTY: FormState = {
  personName: '',
  company: '',
  role: '',
  relationshipType: 'recruiter',
  channel: 'linkedin',
  status: 'planned',
  relatedJobId: '',
  lastContactedAt: '',
  followUpDate: '',
  notes: '',
  messageDraft: '',
}

function outreachToForm(o: Outreach): FormState {
  return {
    personName: o.personName,
    company: o.company,
    role: o.role ?? '',
    relationshipType: o.relationshipType,
    channel: o.channel,
    status: o.status,
    relatedJobId: o.relatedJobId ?? '',
    lastContactedAt: o.lastContactedAt ?? '',
    followUpDate: o.followUpDate ?? '',
    notes: o.notes ?? '',
    messageDraft: o.messageDraft ?? '',
  }
}

interface OutreachModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Outreach, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialData?: Outreach | null
  jobs: Job[]
}

export function OutreachModal({ isOpen, onClose, onSave, initialData, jobs }: OutreachModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    startTransition(() => {
      setForm(initialData ? outreachToForm(initialData) : EMPTY)
      setErrors({})
    })
  }, [isOpen, initialData])

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => nameRef.current?.focus(), 50)
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

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.personName.trim()) errs.personName = 'Required'
    if (!form.company.trim()) errs.company = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSave({
      personName: form.personName.trim(),
      company: form.company.trim(),
      role: form.role.trim() || undefined,
      relationshipType: form.relationshipType,
      channel: form.channel,
      status: form.status,
      relatedJobId: form.relatedJobId || undefined,
      lastContactedAt: form.lastContactedAt || undefined,
      followUpDate: form.followUpDate || undefined,
      notes: form.notes.trim() || undefined,
      messageDraft: form.messageDraft.trim() || undefined,
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
            {initialData ? 'Edit Outreach' : 'Add Outreach'}
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
          {/* Row 1: person + company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Person Name *</label>
              <input
                ref={nameRef}
                value={form.personName}
                onChange={(e) => set('personName', e.target.value)}
                placeholder="Alex Johnson"
                className={`${field} ${errors.personName ? 'border-red-300' : ''}`}
              />
              {errors.personName && <p className="mt-1 text-xs text-red-500">{errors.personName}</p>}
            </div>
            <div>
              <label className={label}>Company *</label>
              <input
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                list="outreach-company-suggestions"
                placeholder="Stripe"
                className={`${field} ${errors.company ? 'border-red-300' : ''}`}
              />
              <datalist id="outreach-company-suggestions">
                {[...new Set(jobs.map((j) => j.company))].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.company && <p className="mt-1 text-xs text-red-500">{errors.company}</p>}
            </div>
          </div>

          {/* Row 2: role + relationship */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Role</label>
              <input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Software Engineer"
                className={field}
              />
            </div>
            <div>
              <label className={label}>Relationship</label>
              <select
                value={form.relationshipType}
                onChange={(e) => set('relationshipType', e.target.value as RelationshipType)}
                className={`${field} bg-white`}
              >
                {RELATIONSHIP_TYPES.map((r) => (
                  <option key={r} value={r}>{RELATIONSHIP_TYPE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: channel + status + linked job */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Channel</label>
              <select
                value={form.channel}
                onChange={(e) => set('channel', e.target.value as OutreachChannel)}
                className={`${field} bg-white`}
              >
                {OUTREACH_CHANNELS.map((c) => (
                  <option key={c} value={c}>{OUTREACH_CHANNEL_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as OutreachStatus)}
                className={`${field} bg-white`}
              >
                {OUTREACH_STATUSES.map((s) => (
                  <option key={s} value={s}>{OUTREACH_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Linked Job</label>
              <select
                value={form.relatedJobId}
                onChange={(e) => set('relatedJobId', e.target.value)}
                className={`${field} bg-white`}
              >
                <option value="">None</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.company} — {j.role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Last Contacted</label>
              <input
                type="date"
                value={form.lastContactedAt}
                onChange={(e) => set('lastContactedAt', e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Follow-up Date</label>
              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) => set('followUpDate', e.target.value)}
                className={field}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={label}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="How you met, key talking points, context..."
              className={`${field} resize-none`}
            />
          </div>

          {/* Message draft */}
          <div>
            <label className={label}>Message Draft</label>
            <textarea
              value={form.messageDraft}
              onChange={(e) => set('messageDraft', e.target.value)}
              rows={4}
              placeholder="Draft your outreach message here, or generate one with AI Assistant..."
              className={`${field} resize-none font-mono text-xs`}
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
            {initialData ? 'Save Changes' : 'Add Outreach'}
          </button>
        </div>
      </div>
    </div>
  )
}
