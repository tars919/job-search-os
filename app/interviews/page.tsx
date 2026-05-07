'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  ROUND_TYPES,
  ROUND_TYPE_LABELS,
  ROUND_TYPE_COLORS,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_COLORS,
  type InterviewPrep,
  type InterviewStatus,
  type RoundType,
} from '@/lib/types'
import { InterviewPrepModal } from '@/components/InterviewPrepModal'

// ─── AI action definitions ────────────────────────────────────────────────────

const AI_ACTIONS = [
  { id: 'gen_interview_questions', icon: '❓', label: 'Practice Questions' },
  { id: 'interview_prep_plan',     icon: '📋', label: 'Prep Plan' },
  { id: 'rewrite_star_story',      icon: '⭐', label: 'STAR Story' },
  { id: 'mock_execution',          icon: '⚡', label: 'Mock Execution' },
  { id: 'mock_product',            icon: '🧩', label: 'Mock Product' },
  { id: 'interview_followup_email',icon: '📧', label: 'Follow-up Email' },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(iso + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
}

function dateBadge(iv: InterviewPrep) {
  if (!iv.interviewDate) return null
  const d = daysUntil(iv.interviewDate)
  if (d < 0) return { label: `${Math.abs(d)}d ago`, color: 'text-zinc-400' }
  if (d === 0) return { label: 'Today!', color: 'text-red-600 font-semibold' }
  if (d === 1) return { label: 'Tomorrow', color: 'text-amber-600 font-semibold' }
  if (d <= 3) return { label: `In ${d}d`, color: 'text-amber-600' }
  return { label: formatDate(iv.interviewDate), color: 'text-zinc-500' }
}

function initials(company: string): string {
  return company.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
]

function avatarColor(str: string): string {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ─── Prep card ────────────────────────────────────────────────────────────────

interface PrepCardProps {
  iv: InterviewPrep
  onEdit: (iv: InterviewPrep) => void
  onDelete: (id: string) => void
}

function PrepCard({ iv, onEdit, onDelete }: PrepCardProps) {
  const router = useRouter()
  const badge = dateBadge(iv)

  function handleAI(taskId: string) {
    const params = new URLSearchParams({ task: taskId })
    if (iv.relatedJobId) params.set('jobId', iv.relatedJobId)
    params.set('interviewId', iv.id)
    router.push(`/assistant?${params.toString()}`)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 hover:border-zinc-300 transition-colors group">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${avatarColor(iv.company)}`}>
          {initials(iv.company)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-zinc-900 leading-snug">{iv.roundName}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${ROUND_TYPE_COLORS[iv.roundType]}`}>
              {ROUND_TYPE_LABELS[iv.roundType]}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${INTERVIEW_STATUS_COLORS[iv.status]}`}>
              {INTERVIEW_STATUS_LABELS[iv.status]}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {iv.company}{iv.role ? ` · ${iv.role}` : ''}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(iv)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            title="Edit"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(iv.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date + interviewer */}
      {(iv.interviewDate || iv.interviewerName) && (
        <div className="flex items-center gap-3 text-xs">
          {badge && (
            <span className={`flex items-center gap-1 ${badge.color}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {badge.label}
            </span>
          )}
          {iv.interviewerName && (
            <span className="text-zinc-400">
              with {iv.interviewerName}{iv.interviewerRole ? ` (${iv.interviewerRole})` : ''}
            </span>
          )}
        </div>
      )}

      {/* Prep snippets */}
      {iv.prepNotes && (
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 border-l-2 border-zinc-100 pl-3">
          {iv.prepNotes}
        </p>
      )}

      {/* Question / story counts */}
      {(iv.questionsToPractice || iv.storiesToUse) && (
        <div className="flex items-center gap-3">
          {iv.questionsToPractice && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-50 rounded-md px-2 py-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Questions
            </span>
          )}
          {iv.storiesToUse && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-50 rounded-md px-2 py-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.51 20 12 16.44 6.49 20l1.88-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69L12 3z" />
              </svg>
              Stories
            </span>
          )}
        </div>
      )}

      {/* Feedback (post-interview) */}
      {iv.feedback && (
        <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 leading-relaxed line-clamp-2">
          💬 {iv.feedback}
        </p>
      )}

      {/* AI action buttons */}
      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
        {AI_ACTIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => handleAI(a.id)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-600 bg-zinc-50 hover:bg-blue-50 hover:text-blue-700 border border-zinc-200 hover:border-blue-200 transition-colors"
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  color,
  children,
  empty,
}: {
  title: string
  count: number
  color: string
  children: React.ReactNode
  empty: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className={`text-sm font-semibold ${color}`}>{title}</h2>
        <span className="text-xs text-zinc-400 tabular-nums">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center border border-dashed border-zinc-200 rounded-xl">{empty}</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const { jobs, interviews, ready, addInterview, updateInterview, deleteInterview } = useStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InterviewPrep | null>(null)
  const [filterCompany, setFilterCompany] = useState('')
  const [filterRoundType, setFilterRoundType] = useState<RoundType | ''>('')
  const [filterStatus, setFilterStatus] = useState<InterviewStatus | ''>('')

  const filtered = useMemo(() => {
    const q = filterCompany.trim().toLowerCase()
    return interviews.filter((iv) => {
      if (q && !iv.company.toLowerCase().includes(q) && !(iv.role ?? '').toLowerCase().includes(q)) return false
      if (filterRoundType && iv.roundType !== filterRoundType) return false
      if (filterStatus && iv.status !== filterStatus) return false
      return true
    })
  }, [interviews, filterCompany, filterRoundType, filterStatus])

  // Sort: date ascending for upcoming, most recent first for completed
  const upcoming = useMemo(
    () =>
      filtered
        .filter((iv) => iv.status === 'upcoming')
        .sort((a, b) => (a.interviewDate ?? '').localeCompare(b.interviewDate ?? '')),
    [filtered],
  )

  const needsPrep = useMemo(
    () =>
      filtered
        .filter((iv) => iv.status === 'needs_prep')
        .sort((a, b) => (a.interviewDate ?? '').localeCompare(b.interviewDate ?? '')),
    [filtered],
  )

  const completed = useMemo(
    () =>
      filtered
        .filter((iv) => iv.status === 'completed' || iv.status === 'done')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [filtered],
  )

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(iv: InterviewPrep) { setEditing(iv); setModalOpen(true) }
  function handleClose() { setModalOpen(false); setEditing(null) }

  function handleSave(data: Omit<InterviewPrep, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editing) {
      updateInterview(editing.id, data)
    } else {
      addInterview(data)
    }
    handleClose()
  }

  const hasFilters = filterCompany !== '' || filterRoundType !== '' || filterStatus !== ''
  const allCompanies = useMemo(() => [...new Set(interviews.map((iv) => iv.company))].sort(), [interviews])

  if (!ready) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-36 bg-zinc-100 rounded animate-pulse" />
        {[0, 1, 2].map((i) => <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Interviews</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {interviews.length === 0
              ? 'Track your interview rounds and prep here.'
              : `${interviews.length} round${interviews.length !== 1 ? 's' : ''} tracked.`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Interview
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            list="iv-company-filter"
            placeholder="Filter by company…"
            className="pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors w-48"
          />
          <datalist id="iv-company-filter">
            {allCompanies.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <select
          value={filterRoundType}
          onChange={(e) => setFilterRoundType(e.target.value as RoundType | '')}
          className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="">All Round Types</option>
          {ROUND_TYPES.map((r) => (
            <option key={r} value={r}>{ROUND_TYPE_LABELS[r]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as InterviewStatus | '')}
          className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="">All Statuses</option>
          {INTERVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>{INTERVIEW_STATUS_LABELS[s]}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setFilterCompany(''); setFilterRoundType(''); setFilterStatus('') }}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty state — no interviews at all */}
      {interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-base font-medium text-zinc-600">No interviews yet</p>
          <p className="text-sm text-zinc-400 mt-1 max-w-xs">
            Add your first interview round to start tracking prep, stories, and feedback.
          </p>
          <button
            onClick={openAdd}
            className="mt-5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Interview
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          <Section
            title="Upcoming"
            count={upcoming.length}
            color="text-blue-700"
            empty="No upcoming interviews."
          >
            {upcoming.map((iv) => (
              <PrepCard key={iv.id} iv={iv} onEdit={openEdit} onDelete={deleteInterview} />
            ))}
          </Section>

          {/* Needs Prep */}
          <Section
            title="Needs Prep"
            count={needsPrep.length}
            color="text-amber-700"
            empty="Nothing flagged as needing prep."
          >
            {needsPrep.map((iv) => (
              <PrepCard key={iv.id} iv={iv} onEdit={openEdit} onDelete={deleteInterview} />
            ))}
          </Section>

          {/* Completed */}
          <Section
            title="Completed"
            count={completed.length}
            color="text-zinc-600"
            empty="No completed interviews yet."
          >
            {completed.map((iv) => (
              <PrepCard key={iv.id} iv={iv} onEdit={openEdit} onDelete={deleteInterview} />
            ))}
          </Section>
        </div>
      )}

      {/* Modal */}
      <InterviewPrepModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        initialData={editing}
        jobs={jobs}
      />
    </div>
  )
}
