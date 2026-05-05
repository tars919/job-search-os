'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import {
  generateActions,
  ACTION_CATEGORY,
  type CopilotAction,
  type ActionType,
} from '@/lib/copilot'

// ─── Snooze persistence ───────────────────────────────────────────────────────

const SNOOZE_KEY = 'jsos:copilot-snoozed'

function loadSnoozed(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}') } catch { return {} }
}

function saveSnoozed(s: Record<string, string>) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(s))
}

function isSnoozed(map: Record<string, string>, jobId: string): boolean {
  const until = map[jobId]
  return !!until && new Date(until) > new Date()
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'apply' | 'interview' | 'followup' | 'stale'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'apply', label: 'Apply' },
  { id: 'interview', label: 'Interview' },
  { id: 'followup', label: 'Follow Up' },
  { id: 'stale', label: 'Stale' },
]

// ─── Urgency styling ──────────────────────────────────────────────────────────

function urgencyStyle(score: number) {
  if (score >= 80) return { ring: 'border-red-400', text: 'text-red-600', bg: 'bg-red-50' }
  if (score >= 60) return { ring: 'border-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' }
  if (score >= 40) return { ring: 'border-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' }
  return { ring: 'border-zinc-300', text: 'text-zinc-500', bg: 'bg-zinc-50' }
}

const ACTION_ICON: Record<ActionType, string> = {
  apply_today: '🚨',
  apply_soon: '📅',
  complete_hirevue: '🎬',
  complete_oa: '💻',
  prep_interview: '🎤',
  follow_up: '💬',
  tailor_resume: '✏️',
  research_company: '🔍',
  revisit: '🔄',
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconExternal() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconSnooze() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ─── Action card ──────────────────────────────────────────────────────────────

interface CardProps {
  action: CopilotAction
  onSnooze: (id: string) => void
  onDone: (id: string) => void
}

function ActionCard({ action, onSnooze, onDone }: CardProps) {
  const router = useRouter()
  const style = urgencyStyle(action.urgencyScore)

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors group">
      {/* Urgency ring */}
      <div
        className={`shrink-0 w-14 h-14 rounded-full border-2 ${style.ring} ${style.bg} flex flex-col items-center justify-center`}
      >
        <span className={`text-base font-bold leading-none ${style.text}`}>{action.urgencyScore}</span>
        <span className="text-[9px] text-zinc-400 mt-0.5">score</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{ACTION_ICON[action.actionType]}</span>
          <p className="text-sm font-semibold text-zinc-900 leading-snug">{action.label}</p>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs font-medium text-zinc-600">{action.company}</span>
          <span className="text-zinc-300 text-xs">·</span>
          <span className="text-xs text-zinc-400 truncate max-w-[200px]">{action.role}</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[action.status]}`}
          >
            {STATUS_LABELS[action.status]}
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{action.why}</p>
      </div>

      {/* Quick actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
        {action.url && (
          <button
            onClick={() => window.open(action.url, '_blank', 'noopener,noreferrer')}
            title="Open job posting"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
          >
            <IconExternal />
          </button>
        )}
        <button
          onClick={() => router.push(`/assistant?task=tailor_bullets&jobId=${action.jobId}`)}
          title="Tailor resume with AI"
          className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <IconDoc />
        </button>
        <button
          onClick={() => router.push(`/assistant?task=draft_recruiter_message&jobId=${action.jobId}`)}
          title="Draft recruiter message"
          className="p-2 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
        >
          <IconChat />
        </button>
        <button
          onClick={() => onSnooze(action.jobId)}
          title="Snooze 24 hours"
          className="p-2 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
        >
          <IconSnooze />
        </button>
        <button
          onClick={() => onDone(action.jobId)}
          title="Mark complete"
          className="p-2 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          <IconCheck />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const { jobs, ready, updateJob } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [snoozed, setSnoozed] = useState<Record<string, string>>({})

  useEffect(() => {
    setSnoozed(loadSnoozed())
  }, [])

  const allActions = useMemo(
    () => (ready ? generateActions(jobs).filter((a) => !isSnoozed(snoozed, a.jobId)) : []),
    [jobs, ready, snoozed],
  )

  const filtered = useMemo(
    () => (filter === 'all' ? allActions : allActions.filter((a) => ACTION_CATEGORY[a.actionType] === filter)),
    [allActions, filter],
  )

  const counts = useMemo(
    () => ({
      all: allActions.length,
      apply: allActions.filter((a) => ACTION_CATEGORY[a.actionType] === 'apply').length,
      interview: allActions.filter((a) => ACTION_CATEGORY[a.actionType] === 'interview').length,
      followup: allActions.filter((a) => ACTION_CATEGORY[a.actionType] === 'followup').length,
      stale: allActions.filter((a) => ACTION_CATEGORY[a.actionType] === 'stale').length,
    }),
    [allActions],
  )

  function handleSnooze(jobId: string) {
    const until = new Date(Date.now() + 86_400_000).toISOString()
    const next = { ...snoozed, [jobId]: until }
    setSnoozed(next)
    saveSnoozed(next)
  }

  function handleDone(jobId: string) {
    updateJob(jobId, { status: 'closed' })
  }

  if (!ready) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse" />
        <div className="h-4 w-56 bg-zinc-100 rounded animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[88px] bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const topScore = allActions[0]?.urgencyScore ?? 0
  const badgeColor =
    topScore >= 80 ? 'bg-red-50 text-red-600' :
    topScore >= 60 ? 'bg-amber-50 text-amber-600' :
    'bg-blue-50 text-blue-600'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Copilot</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {allActions.length === 0
              ? 'All caught up — no pending actions.'
              : `${allActions.length} action${allActions.length !== 1 ? 's' : ''} ranked by urgency.`}
          </p>
        </div>
        {allActions.length > 0 && (
          <span className={`mt-1 px-3 py-1 rounded-full text-sm font-semibold ${badgeColor}`}>
            {allActions.length} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 mb-5 border-b border-zinc-100">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f.id
                ? 'text-blue-600 border-blue-600'
                : 'text-zinc-500 hover:text-zinc-900 border-transparent'
            }`}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                  filter === f.id ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                {counts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-base font-medium text-zinc-600">
            {filter === 'all' ? 'All caught up!' : `No ${filter} actions right now.`}
          </p>
          <p className="text-sm text-zinc-400 mt-1 max-w-xs">
            {filter === 'all'
              ? 'Add applications or revisit when deadlines approach.'
              : 'Switch to All to see everything.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((action) => (
            <ActionCard
              key={action.jobId}
              action={action}
              onSnooze={handleSnooze}
              onDone={handleDone}
            />
          ))}
        </div>
      )}
    </div>
  )
}
