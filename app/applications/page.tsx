'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import {
  JOB_STATUSES,
  PRIORITIES,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type Job,
} from '@/lib/types'
import { JobModal } from '@/components/JobModal'

// ─── Deadline helpers ────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function dueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d`
}

function dueColor(days: number): string {
  if (days < 0) return 'text-red-600 font-semibold'
  if (days <= 1) return 'text-red-500 font-semibold'
  if (days <= 3) return 'text-amber-600 font-medium'
  if (days <= 7) return 'text-yellow-600'
  return 'text-zinc-400'
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-50">
      {[140, 200, 100, 110, 90, 80, 70].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className={`h-4 bg-zinc-100 rounded animate-pulse`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { jobs, addJob, updateJob, deleteJob, ready } = useStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Job | null>(null)

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
    } else {
      addJob(data)
    }
  }

  function handleDelete(id: string, company: string) {
    if (window.confirm(`Remove ${company} from your applications?`)) {
      deleteJob(id)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
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
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Application
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2.5 mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
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

        {/* Status */}
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

        {/* Priority */}
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

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Deadline
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Priority
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Actions
                </th>
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
                  const priority = job.priority ?? 'medium'

                  return (
                    <tr key={job.id} className="hover:bg-zinc-50/60 transition-colors group">
                      {/* Company */}
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

                      {/* Role */}
                      <td className="px-4 py-3.5 text-zinc-600 max-w-[220px]">
                        <span className="block truncate" title={job.role}>
                          {job.role}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">
                        {job.location ?? <span className="text-zinc-200">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}
                        >
                          {STATUS_LABELS[job.status]}
                        </span>
                      </td>

                      {/* Deadline */}
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

                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority]}`}
                        >
                          {PRIORITY_LABELS[priority]}
                        </span>
                      </td>

                      {/* Actions */}
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

        {/* Table footer count */}
        {ready && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-50 bg-zinc-50/40">
            <p className="text-xs text-zinc-400">
              {filtered.length} application{filtered.length !== 1 ? 's' : ''}
              {hasFilters && ` · ${jobs.length} total`}
            </p>
          </div>
        )}
      </div>

      <JobModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editTarget}
      />
    </div>
  )
}
