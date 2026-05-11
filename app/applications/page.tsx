'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  JOB_STATUSES,
  PRIORITIES,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type Job,
  type JobStatus,
  type Priority,
} from '@/lib/types'
import { JobModal } from '@/components/JobModal'
import { useToast } from '@/lib/toast'
import { useHotkey } from '@/lib/hotkeys'
import { daysUntil, dueLabel, dueColor } from '@/lib/utils'

// Computed once at module load — avoids Date.now() during render
const MODULE_NOW = Date.now()

// ─── Follow-Up Queue ──────────────────────────────────────────────────────────

const FOLLOWUP_THRESHOLD = 7   // days since last update before follow-up is suggested
const FOLLOWUP_STATUSES: JobStatus[] = ['applied', 'recruiter_screen', 'interview', 'final_round']

interface FollowUpJob {
  job: Job
  daysSince: number
  urgency: 'high' | 'medium' | 'low'
}

function getFollowUpQueue(jobs: Job[]): FollowUpJob[] {
  return jobs
    .filter((j) => FOLLOWUP_STATUSES.includes(j.status))
    .map((j) => {
      const daysSince = Math.floor((MODULE_NOW - new Date(j.updatedAt).getTime()) / 86_400_000)
      return { job: j, daysSince }
    })
    .filter(({ daysSince }) => daysSince >= FOLLOWUP_THRESHOLD)
    .map(({ job, daysSince }): FollowUpJob => ({
      job,
      daysSince,
      urgency: daysSince >= 21 ? 'high' : daysSince >= 14 ? 'medium' : 'low',
    }))
    .sort((a, b) => b.daysSince - a.daysSince)
}

const URGENCY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-zinc-500',
}

interface FollowUpQueueProps {
  jobs: Job[]
  onLogFollowUp: (job: Job) => void
  onDraftEmail: (job: Job) => void
}

function FollowUpQueue({ jobs, onLogFollowUp, onDraftEmail }: FollowUpQueueProps) {
  const queue = useMemo(() => getFollowUpQueue(jobs), [jobs])
  const [collapsed, setCollapsed] = useState(false)

  if (queue.length === 0) return null

  return (
    <div className="mb-6 bg-white rounded-xl border border-amber-200 overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-amber-100 hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">💬</span>
          <h2 className="text-sm font-semibold text-amber-900">Follow-Up Queue</h2>
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            {queue.length}
          </span>
          <span className="text-xs text-amber-600">· No update in {FOLLOWUP_THRESHOLD}+ days</span>
        </div>
        <svg
          className={`w-4 h-4 text-amber-600 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="divide-y divide-amber-50">
          {queue.slice(0, 8).map(({ job, daysSince, urgency }) => (
            <div key={job.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{job.company}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                    {STATUS_LABELS[job.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">{job.role}</p>
              </div>
              <span className={`shrink-0 text-xs font-semibold tabular-nums ${URGENCY_COLORS[urgency]}`}>
                {daysSince}d ago
              </span>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => onDraftEmail(job)}
                  className="px-2.5 py-1 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors border border-violet-200"
                >
                  Draft Email
                </button>
                <button
                  onClick={() => onLogFollowUp(job)}
                  className="px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-md transition-colors border border-zinc-200"
                >
                  Log Sent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Kanban columns config ────────────────────────────────────────────────────

const BOARD_COLUMNS: { id: string; label: string; statuses: JobStatus[] }[] = [
  { id: 'wishlist', label: 'Wishlist', statuses: ['saved', 'researching', 'ready_to_apply'] },
  { id: 'applied', label: 'Applied', statuses: ['applied'] },
  { id: 'screening', label: 'Screening', statuses: ['oa', 'hirevue', 'recruiter_screen'] },
  { id: 'interview', label: 'Interview', statuses: ['interview', 'final_round'] },
  { id: 'offer', label: 'Offer', statuses: ['offer'] },
  { id: 'closed', label: 'Closed', statuses: ['rejected', 'closed'] },
]

const COLUMN_ACCENT: Record<string, string> = {
  wishlist: 'border-zinc-300',
  applied: 'border-amber-400',
  screening: 'border-orange-400',
  interview: 'border-purple-400',
  offer: 'border-emerald-400',
  closed: 'border-zinc-200',
}

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-zinc-300',
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-50">
      {[140, 200, 100, 110, 90, 80, 70].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-zinc-100 rounded animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Board card ───────────────────────────────────────────────────────────────

interface BoardCardProps {
  job: Job
  onEdit: (job: Job) => void
  onDelete: (id: string, company: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
}

function BoardCard({ job, onEdit, onDelete, onStatusChange }: BoardCardProps) {
  const [statusOpen, setStatusOpen] = useState(false)
  const priority = (job.priority ?? 'medium') as Priority
  const days = job.deadline ? daysUntil(job.deadline) : null

  return (
    <div
      className="group bg-white rounded-lg border border-zinc-200 p-3 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onEdit(job)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[priority]}`} />
          <p className="text-sm font-semibold text-zinc-900 truncate">{job.company}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(job.id, job.company) }}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-300 hover:text-red-500 transition-all"
          aria-label="Delete"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-zinc-500 truncate mb-2" title={job.role}>{job.role}</p>

      {days !== null && (
        <p className={`text-[10px] font-medium mb-2 ${dueColor(days)}`}>
          {dueLabel(days)}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setStatusOpen((v) => !v)}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[job.status]}`}
          >
            {STATUS_LABELS[job.status]}
          </button>
          {statusOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 w-44">
              {JOB_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(job.id, s); setStatusOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors ${s === job.status ? 'font-semibold text-blue-600' : 'text-zinc-700'}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
        {job.location && (
          <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">{job.location}</span>
        )}
      </div>
    </div>
  )
}

// ─── Board view ───────────────────────────────────────────────────────────────

interface BoardViewProps {
  jobs: Job[]
  onEdit: (job: Job) => void
  onDelete: (id: string, company: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
  onAdd: () => void
}

function BoardView({ jobs, onEdit, onDelete, onStatusChange, onAdd }: BoardViewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[520px]">
      {BOARD_COLUMNS.map((col) => {
        const colJobs = jobs.filter((j) => col.statuses.includes(j.status))
        return (
          <div key={col.id} className="shrink-0 w-56">
            <div className={`flex items-center justify-between mb-2 pb-2 border-b-2 ${COLUMN_ACCENT[col.id]}`}>
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">{col.label}</span>
              <span className="text-xs font-medium text-zinc-400 tabular-nums">{colJobs.length}</span>
            </div>
            <div className="space-y-2">
              {colJobs.map((job) => (
                <BoardCard
                  key={job.id}
                  job={job}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              ))}
              {colJobs.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center">
                  <p className="text-xs text-zinc-400">No jobs</p>
                </div>
              )}
              {col.id === 'wishlist' && (
                <button
                  onClick={onAdd}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add job
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'board'

export default function ApplicationsPage() {
  const { jobs, addJob, updateJob, deleteJob, ready } = useStore()
  const toast = useToast()
  const router = useRouter()

  const [view, setView] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Job | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useHotkey('n', openAdd)
  useHotkey('/', () => { searchRef.current?.focus() })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((j) => {
      if (q) {
        const hit =
          j.company.toLowerCase().includes(q) ||
          j.role.toLowerCase().includes(q) ||
          (j.notes?.toLowerCase().includes(q) ?? false)
        if (!hit) return false
      }
      if (statusFilter !== 'all' && j.status !== statusFilter) return false
      if (priorityFilter !== 'all' && (j.priority ?? 'medium') !== priorityFilter) return false
      return true
    })
  }, [jobs, search, statusFilter, priorityFilter])

  const hasFilters = search !== '' || statusFilter !== 'all' || priorityFilter !== 'all'

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(job: Job) {
    setEditTarget(job)
    setModalOpen(true)
  }

  function handleSave(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editTarget) {
      updateJob(editTarget.id, data)
      toast(`${data.company} updated`, 'success')
    } else {
      addJob(data)
      toast(`${data.company} added`, 'success')
    }
  }

  function handleDelete(id: string, company: string) {
    if (window.confirm(`Remove ${company} from your applications?`)) {
      deleteJob(id)
      toast(`${company} removed`, 'success')
    }
  }

  function handleStatusChange(id: string, status: JobStatus) {
    updateJob(id, { status })
    const job = jobs.find((j) => j.id === id)
    if (job) toast(`${job.company} → ${STATUS_LABELS[status]}`, 'success')
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
  }

  function handleLogFollowUp(job: Job) {
    updateJob(job.id, {})  // bumps updatedAt, resetting the stale clock
    toast(`Follow-up logged for ${job.company}`, 'success')
  }

  function handleDraftFollowUp(job: Job) {
    const params = new URLSearchParams({
      task: 'draft_follow_up_email',
      jobId: job.id,
    })
    router.push(`/assistant?${params.toString()}`)
  }

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Applications</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ready
              ? hasFilters
                ? `${filtered.length} of ${jobs.length} shown`
                : `${jobs.length} total`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
            {(['table', 'board'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {v === 'table' ? (
                  <span className="flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
                    </svg>
                    Table
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    Board
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Application
            <kbd className="ml-1 rounded bg-blue-500 px-1.5 py-0.5 font-mono text-[10px] text-blue-100">N</kbd>
          </button>
        </div>
      </div>

      {/* ── Follow-up queue (shown when data is ready) ── */}
      {ready && (
        <FollowUpQueue
          jobs={jobs}
          onLogFollowUp={handleLogFollowUp}
          onDraftEmail={handleDraftFollowUp}
        />
      )}

      {/* ── Filters (table view only) ── */}
      {view === 'table' && (
        <div className="flex items-center gap-2.5 mb-5">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, role, notes…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Statuses</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Board view ── */}
      {view === 'board' && ready && (
        <BoardView
          jobs={jobs}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onAdd={openAdd}
        />
      )}

      {/* ── Table view ── */}
      {view === 'table' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Deadline</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-50">
                {!ready ? (
                  [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {jobs.length === 0 ? 'No applications yet' : 'No results match your filters'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {jobs.length === 0
                          ? 'Click "Add Application" to get started.'
                          : 'Try adjusting your search or clearing the filters.'}
                      </p>
                      {hasFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((job) => {
                    const days = job.deadline ? daysUntil(job.deadline) : null
                    const priority = (job.priority ?? 'medium') as Priority

                    return (
                      <tr key={job.id} className="hover:bg-zinc-50/60 transition-colors group">
                        <td className="px-4 py-3.5 font-medium text-zinc-900 whitespace-nowrap">
                          {job.url ? (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600 underline-offset-2 hover:underline transition-colors"
                            >
                              {job.company}
                            </a>
                          ) : (
                            job.company
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-600 max-w-[220px]">
                          <span className="block truncate" title={job.role}>{job.role}</span>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">
                          {job.location ?? <span className="text-zinc-200">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                            {STATUS_LABELS[job.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {days !== null ? (
                            <span className={dueColor(days)}>
                              {new Date(job.deadline! + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                              <span className="ml-1.5 text-xs opacity-80">({dueLabel(days)})</span>
                            </span>
                          ) : (
                            <span className="text-zinc-200">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
                            {PRIORITY_LABELS[priority]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEdit(job)}
                            className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <span className="mx-2 text-zinc-200 select-none">·</span>
                          <button
                            onClick={() => handleDelete(job.id, job.company)}
                            className="text-xs font-medium text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {ready && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-50 bg-zinc-50/40">
              <p className="text-xs text-zinc-400">
                {filtered.length} application{filtered.length !== 1 ? 's' : ''}
                {hasFilters && ` · ${jobs.length} total`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Board skeleton */}
      {view === 'board' && !ready && (
        <div className="flex gap-4">
          {BOARD_COLUMNS.map((col) => (
            <div key={col.id} className="shrink-0 w-56">
              <div className="h-5 w-20 bg-zinc-100 rounded animate-pulse mb-3" />
              {[0, 1].map((i) => <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse mb-2" />)}
            </div>
          ))}
        </div>
      )}

      <JobModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editTarget}
      />
    </div>
  )
}
