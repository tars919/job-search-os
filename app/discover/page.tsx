'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/lib/toast'
import { useHotkey } from '@/lib/hotkeys'
import { getSupabase } from '@/lib/supabase/client'
import { DiscoverModal } from '@/components/DiscoverModal'
import { timeAgo } from '@/lib/utils'
import {
  DISCOVERY_SOURCE_LABELS,
  DISCOVERY_SOURCE_COLORS,
  WORK_MODES,
  type JobDiscovery,
  type WorkMode,
} from '@/lib/types'
import { buildFitPrompt, parseFitResult, fitScoreBg, fitBarColor } from '@/lib/discover'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'discover' | 'saved' | 'all'

// ─── Fit score badge ──────────────────────────────────────────────────────────

function FitBadge({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${fitScoreBg(score)}`}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {score}%
    </span>
  )
}

// ─── Discovery card (grid / list view) ───────────────────────────────────────

function DiscoveryListCard({
  discovery,
  onEdit,
  onDelete,
  onSave,
  onReject,
  onAddToApps,
  scoring,
  onScore,
}: {
  discovery: JobDiscovery
  onEdit: (d: JobDiscovery) => void
  onDelete: (id: string) => void
  onSave: (id: string) => void
  onReject: (id: string) => void
  onAddToApps: (d: JobDiscovery) => void
  scoring: boolean
  onScore: (d: JobDiscovery) => void
}) {
  const statusBadge = discovery.saved
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : discovery.rejected
    ? 'bg-zinc-100 text-zinc-400 border-zinc-200'
    : 'bg-blue-50 text-blue-700 border-blue-200'

  const statusLabel = discovery.applied
    ? 'Applied'
    : discovery.saved
    ? 'Saved'
    : discovery.rejected
    ? 'Skipped'
    : 'New'

  return (
    <div className="bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 transition-colors overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${DISCOVERY_SOURCE_COLORS[discovery.source]}`}>
                {DISCOVERY_SOURCE_LABELS[discovery.source]}
              </span>
              {discovery.workMode && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-500">
                  {discovery.workMode}
                </span>
              )}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 leading-snug truncate">{discovery.title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{discovery.company}
              {discovery.location && <span className="text-zinc-400"> · {discovery.location}</span>}
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {discovery.fitScore != null ? (
              <FitBadge score={discovery.fitScore} />
            ) : (
              <button
                onClick={() => onScore(discovery)}
                disabled={scoring}
                className="text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
              >
                {scoring ? 'Scoring…' : 'Score ✦'}
              </button>
            )}
          </div>
        </div>

        {discovery.salaryRange && (
          <p className="text-xs text-zinc-500 font-medium">{discovery.salaryRange}</p>
        )}
      </div>

      {/* Fit score bar */}
      {discovery.fitScore != null && (
        <div className="px-5 pb-3">
          <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${fitBarColor(discovery.fitScore)}`}
              style={{ width: `${discovery.fitScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Skills */}
      {discovery.requiredSkills.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1">
          {discovery.requiredSkills.slice(0, 6).map((s) => (
            <span key={s} className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
              {s}
            </span>
          ))}
          {discovery.requiredSkills.length > 6 && (
            <span className="text-[10px] text-zinc-400">+{discovery.requiredSkills.length - 6} more</span>
          )}
        </div>
      )}

      {/* Missing skills */}
      {(discovery.missingSkills ?? []).length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1">
          <span className="text-[10px] text-zinc-400 mr-1">Missing:</span>
          {(discovery.missingSkills ?? []).slice(0, 4).map((s) => (
            <span key={s} className="inline-flex items-center rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-5 py-3 border-t border-zinc-50 bg-zinc-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {!discovery.saved && !discovery.rejected && (
            <>
              <button
                onClick={() => onSave(discovery.id)}
                className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => onReject(discovery.id)}
                className="px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
              >
                Skip
              </button>
            </>
          )}
          {discovery.saved && !discovery.applied && (
            <button
              onClick={() => onAddToApps(discovery)}
              className="px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              → Applications
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {discovery.sourceUrl && (
            <a
              href={discovery.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
            >
              Link ↗
            </a>
          )}
          <button
            onClick={() => onEdit(discovery)}
            className="text-[10px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(discovery.id)}
            className="text-[10px] font-medium text-zinc-300 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Swipe card ───────────────────────────────────────────────────────────────

function SwipeCard({
  discovery,
  onSave,
  onSkip,
  onScore,
  scoring,
  onAddToApps,
}: {
  discovery: JobDiscovery
  onSave: () => void
  onSkip: () => void
  onScore: () => void
  scoring: boolean
  onAddToApps: () => void
}) {
  const startXRef = useRef(0)
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flyDir, setFlyDir] = useState<null | 'left' | 'right'>(null)

  const THRESHOLD = 90

  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button, a')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startXRef.current = e.clientX
    setDragging(true)
    setFlyDir(null)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setOffsetX(e.clientX - startXRef.current)
  }

  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    if (offsetX > THRESHOLD) {
      setFlyDir('right')
      setTimeout(() => { setOffsetX(0); setFlyDir(null); onSave() }, 280)
    } else if (offsetX < -THRESHOLD) {
      setFlyDir('left')
      setTimeout(() => { setOffsetX(0); setFlyDir(null); onSkip() }, 280)
    } else {
      setOffsetX(0)
    }
  }

  const rotation = offsetX * 0.07
  const transform = flyDir === 'right'
    ? 'translateX(150%) rotate(18deg) scale(1.02)'
    : flyDir === 'left'
    ? 'translateX(-150%) rotate(-18deg) scale(1.02)'
    : `translateX(${offsetX}px) rotate(${rotation}deg)`

  const transition = dragging ? 'none' : 'transform 0.28s cubic-bezier(.22,.61,.36,1)'
  const goingRight = !flyDir && offsetX > THRESHOLD * 0.4
  const goingLeft = !flyDir && offsetX < -THRESHOLD * 0.4

  return (
    <div
      className="relative select-none cursor-grab active:cursor-grabbing touch-none"
      style={{ transform, transition }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-lg overflow-hidden w-full max-w-md mx-auto">
        {/* Save/Skip overlays */}
        {goingRight && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center pointer-events-none">
            <span className="text-emerald-600 font-bold text-2xl tracking-wide rotate-[-12deg] border-2 border-emerald-400 px-4 py-1 rounded-lg bg-white/80">
              SAVE
            </span>
          </div>
        )}
        {goingLeft && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-red-500/10 border-2 border-red-400 flex items-center justify-center pointer-events-none">
            <span className="text-red-500 font-bold text-2xl tracking-wide rotate-[12deg] border-2 border-red-400 px-4 py-1 rounded-lg bg-white/80">
              SKIP
            </span>
          </div>
        )}

        {/* Card content */}
        <div className="px-6 pt-6 pb-4">
          {/* Source + work mode */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${DISCOVERY_SOURCE_COLORS[discovery.source]}`}>
              {DISCOVERY_SOURCE_LABELS[discovery.source]}
            </span>
            {discovery.workMode && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500">
                {discovery.workMode}
              </span>
            )}
            {discovery.sourceUrl && (
              <a
                href={discovery.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto text-xs text-blue-500 hover:text-blue-700 transition-colors"
              >
                View posting ↗
              </a>
            )}
          </div>

          {/* Title + company */}
          <h2 className="text-xl font-bold text-zinc-900 leading-tight">{discovery.title}</h2>
          <p className="mt-1 text-sm text-zinc-500 font-medium">
            {discovery.company}
            {discovery.location && (
              <span className="font-normal text-zinc-400"> · {discovery.location}</span>
            )}
          </p>

          {/* Salary */}
          {discovery.salaryRange && (
            <p className="mt-2 text-sm font-semibold text-zinc-700">{discovery.salaryRange}</p>
          )}

          {/* Fit score */}
          {discovery.fitScore != null ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">AI Fit Score</span>
                <FitBadge score={discovery.fitScore} />
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${fitBarColor(discovery.fitScore)}`}
                  style={{ width: `${discovery.fitScore}%` }}
                />
              </div>
              {(discovery.fitWhy ?? []).length > 0 && (
                <div className="space-y-1 pt-1">
                  {(discovery.fitWhy ?? []).slice(0, 3).map((reason, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      {reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={(e) => { e.stopPropagation(); onScore() }}
                disabled={scoring}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
              >
                {scoring ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Scoring with AI…
                  </>
                ) : (
                  <>✦ Score with AI</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Required skills */}
        {discovery.requiredSkills.length > 0 && (
          <div className="px-6 pb-4">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Required Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {discovery.requiredSkills.slice(0, 8).map((s) => (
                <span key={s} className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing skills */}
        {(discovery.missingSkills ?? []).length > 0 && (
          <div className="px-6 pb-4">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Skills to Build</p>
            <div className="flex flex-wrap gap-1.5">
              {(discovery.missingSkills ?? []).map((s) => (
                <span key={s} className="inline-flex items-center rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description preview */}
        {discovery.description && (
          <div className="px-6 pb-4">
            <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">{discovery.description}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
          <p className="text-xs text-zinc-400">{timeAgo(discovery.createdAt)}</p>
          {discovery.saved && !discovery.applied && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToApps() }}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              → Add to Applications
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  const messages: Record<Tab, { icon: React.ReactNode; title: string; body: string }> = {
    discover: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      ),
      title: 'No jobs to discover',
      body: 'Add jobs from LinkedIn, Indeed, or company sites to start swiping.',
    },
    saved: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: 'No saved jobs',
      body: 'Swipe right or click Save on jobs you want to revisit.',
    },
    all: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      title: 'No discoveries yet',
      body: 'Add your first job to get started.',
    },
  }

  const m = messages[tab]

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
        {m.icon}
      </div>
      <p className="text-sm font-medium text-zinc-600">{m.title}</p>
      <p className="text-xs text-zinc-400 mt-1 max-w-xs">{m.body}</p>
      <button
        onClick={onAdd}
        className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Add Job
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { discoveries, addDiscovery, updateDiscovery, deleteDiscovery, jobs, resources, ready } =
    useStore()
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('discover')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<JobDiscovery | null>(null)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [workModeFilter, setWorkModeFilter] = useState<WorkMode | 'all'>('all')
  const [sourcingIndex, setSourcingIndex] = useState(0) // which card in queue is being scored
  const [scoreLoadingId, setScoreLoadingId] = useState<string | null>(null)

  // Load profile for AI fit scoring
  const [profile, setProfile] = useState<{ name?: string; targetRoles?: string[]; preferredLocations?: string[]; yearsExperience?: number | null } | null>(null)
  useEffect(() => {
    if (!user) return
    getSupabase()
      .from('user_profiles')
      .select('name, target_roles, preferred_locations, years_experience')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            name: data.name ?? undefined,
            targetRoles: data.target_roles as string[] | undefined,
            preferredLocations: data.preferred_locations as string[] | undefined,
            yearsExperience: data.years_experience as number | null,
          })
        }
      })
  }, [user])

  // ─── Filtered views ─────────────────────────────────────────────────────────

  const allLocations = useMemo(
    () => Array.from(new Set(discoveries.map((d) => d.location).filter(Boolean) as string[])).sort(),
    [discoveries],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return discoveries.filter((d) => {
      if (locationFilter !== 'all' && d.location !== locationFilter) return false
      if (workModeFilter !== 'all' && d.workMode !== workModeFilter) return false
      if (q) {
        const hit =
          d.title.toLowerCase().includes(q) ||
          d.company.toLowerCase().includes(q) ||
          (d.description?.toLowerCase().includes(q) ?? false) ||
          d.requiredSkills.some((s) => s.toLowerCase().includes(q))
        if (!hit) return false
      }
      return true
    })
  }, [discoveries, search, locationFilter, workModeFilter])

  const queue = useMemo(
    () => filtered.filter((d) => !d.saved && !d.rejected),
    [filtered],
  )

  const saved = useMemo(
    () => filtered.filter((d) => d.saved),
    [filtered],
  )

  const currentCard = queue[0] ?? null

  // Advance index when queue shrinks (card is actioned)
  useEffect(() => {
    startTransition(() => setSourcingIndex(0))
  }, [queue.length])

  // ─── Hotkeys ─────────────────────────────────────────────────────────────────

  useHotkey('ArrowRight', () => { if (tab === 'discover' && currentCard) handleSave(currentCard.id) })
  useHotkey('ArrowLeft', () => { if (tab === 'discover' && currentCard) handleSkip(currentCard.id) })
  useHotkey('n', () => { setEditTarget(null); setModalOpen(true) })

  // ─── Actions ─────────────────────────────────────────────────────────────────

  function handleSave(id: string) {
    updateDiscovery(id, { saved: true, rejected: false })
    toast('Saved', 'success')
    if (tab === 'discover') setTab('discover') // stay, queue advances
  }

  function handleSkip(id: string) {
    updateDiscovery(id, { rejected: true, saved: false })
  }

  function handleDelete(id: string) {
    deleteDiscovery(id)
    toast('Removed', 'success')
  }

  function handleEdit(d: JobDiscovery) {
    setEditTarget(d)
    setModalOpen(true)
  }

  function handleSaveModal(data: Omit<JobDiscovery, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editTarget) {
      updateDiscovery(editTarget.id, data)
      toast(`"${data.title}" updated`, 'success')
    } else {
      addDiscovery(data)
      toast(`"${data.title}" added`, 'success')
    }
  }

  function handleAddToApps(d: JobDiscovery) {
    const { addJob } = useStoreRef.current
    addJob({
      company: d.company,
      role: d.title,
      status: 'saved',
      location: d.location,
      salaryRange: d.salaryRange,
      url: d.sourceUrl,
      notes: d.description ? d.description.slice(0, 500) : undefined,
    })
    updateDiscovery(d.id, { applied: true })
    toast(`"${d.title}" added to Applications`, 'success')
  }

  // Store ref to avoid closure issues in handleAddToApps
  const storeRef = useStore()
  const useStoreRef = useRef(storeRef)
  useEffect(() => { useStoreRef.current = storeRef })

  // ─── AI Fit Scoring ──────────────────────────────────────────────────────────

  const scoreDiscovery = useCallback(
    async (d: JobDiscovery) => {
      if (scoreLoadingId) return
      setScoreLoadingId(d.id)
      try {
        const prompt = buildFitPrompt(d, profile, jobs, resources)
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })
        if (!res.ok) throw new Error('API error')

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response')
        const dec = new TextDecoder()
        let acc = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += dec.decode(value, { stream: true })
        }

        const result = parseFitResult(acc)
        if (result) {
          updateDiscovery(d.id, {
            fitScore: result.score,
            fitWhy: result.why,
            missingSkills: result.missingSkills,
          })
          toast(`Fit score: ${result.score}%`, 'success')
        } else {
          toast('Could not parse AI response', 'error')
        }
      } catch {
        toast('Scoring failed — check your API key', 'error')
      } finally {
        setScoreLoadingId(null)
      }
    },
    [scoreLoadingId, profile, jobs, resources, updateDiscovery, toast],
  )

  const hasFilters = search !== '' || locationFilter !== 'all' || workModeFilter !== 'all'

  // ─── Skeleton ─────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <div className="p-8">
        <div className="h-7 w-48 bg-zinc-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-zinc-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Discover Jobs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {discoveries.length === 0
              ? 'Add jobs to discover'
              : `${queue.length} to review · ${saved.length} saved · ${discoveries.filter((d) => d.rejected).length} skipped`}
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Job
          <kbd className="ml-1 rounded bg-blue-500 px-1.5 py-0.5 font-mono text-[10px] text-blue-100">N</kbd>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-5 bg-zinc-100/60 rounded-xl p-1 w-fit">
        {(['discover', 'saved', 'all'] as Tab[]).map((t) => {
          const count = t === 'discover' ? queue.length : t === 'saved' ? saved.length : discoveries.length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t === 'discover' ? 'Discover' : t === 'saved' ? 'Saved' : 'All'}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${tab === t ? 'text-zinc-400' : 'text-zinc-400'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Filters (shown for saved + all tabs) ── */}
      {tab !== 'discover' && (
        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, company, skills…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {allLocations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {allLocations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          <select
            value={workModeFilter}
            onChange={(e) => setWorkModeFilter(e.target.value as WorkMode | 'all')}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Any Mode</option>
            {WORK_MODES.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setLocationFilter('all'); setWorkModeFilter('all') }}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* DISCOVER TAB — Swipe stack                                              */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {tab === 'discover' && (
        <div className="flex flex-col items-center gap-6">
          {queue.length === 0 ? (
            <EmptyState tab="discover" onAdd={() => { setEditTarget(null); setModalOpen(true) }} />
          ) : (
            <>
              {/* Card stack */}
              <div className="relative w-full max-w-md" style={{ height: '520px' }}>
                {/* Ghost card 3 */}
                {queue.length >= 3 && (
                  <div
                    className="absolute inset-0 bg-white rounded-2xl border border-zinc-200 shadow"
                    style={{ transform: 'translateY(12px) scale(0.93)', zIndex: 1 }}
                  />
                )}
                {/* Ghost card 2 */}
                {queue.length >= 2 && (
                  <div
                    className="absolute inset-0 bg-white rounded-2xl border border-zinc-200 shadow-md"
                    style={{ transform: 'translateY(6px) scale(0.965)', zIndex: 2 }}
                  />
                )}
                {/* Active card */}
                {currentCard && (
                  <div className="absolute inset-0" style={{ zIndex: 3 }}>
                    <SwipeCard
                      key={currentCard.id}
                      discovery={currentCard}
                      onSave={() => handleSave(currentCard.id)}
                      onSkip={() => handleSkip(currentCard.id)}
                      onScore={() => scoreDiscovery(currentCard)}
                      scoring={scoreLoadingId === currentCard.id}
                      onAddToApps={() => handleAddToApps(currentCard)}
                    />
                  </div>
                )}
              </div>

              {/* Action buttons + progress */}
              <div className="flex flex-col items-center gap-4 w-full max-w-md">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => currentCard && handleSkip(currentCard.id)}
                    className="w-14 h-14 rounded-full border-2 border-zinc-200 bg-white text-zinc-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm flex items-center justify-center"
                    title="Skip (←)"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  {currentCard && (
                    <button
                      onClick={() => scoreDiscovery(currentCard)}
                      disabled={!!scoreLoadingId || currentCard.fitScore != null}
                      className="w-10 h-10 rounded-full border border-zinc-200 bg-white text-zinc-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center disabled:opacity-40"
                      title="Score with AI"
                    >
                      {scoreLoadingId === currentCard.id ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <span className="text-sm">✦</span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => currentCard && handleSave(currentCard.id)}
                    className="w-14 h-14 rounded-full border-2 border-zinc-200 bg-white text-zinc-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm flex items-center justify-center"
                    title="Save (→)"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>

                {/* Progress + shortcuts */}
                <div className="text-center space-y-1">
                  <p className="text-xs text-zinc-400">
                    {sourcingIndex + 1} of {queue.length} jobs to review
                  </p>
                  <p className="text-[10px] text-zinc-300">
                    <kbd className="font-mono">←</kbd> skip &nbsp;·&nbsp;
                    <kbd className="font-mono">→</kbd> save &nbsp;·&nbsp;
                    <kbd className="font-mono">✦</kbd> AI score
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SAVED TAB                                                               */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {tab === 'saved' && (
        saved.length === 0 ? (
          <EmptyState tab="saved" onAdd={() => { setEditTarget(null); setModalOpen(true) }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {saved.map((d) => (
              <DiscoveryListCard
                key={d.id}
                discovery={d}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSave={handleSave}
                onReject={handleSkip}
                onAddToApps={handleAddToApps}
                scoring={scoreLoadingId === d.id}
                onScore={scoreDiscovery}
              />
            ))}
          </div>
        )
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ALL TAB                                                                 */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {tab === 'all' && (
        filtered.length === 0 ? (
          <EmptyState tab="all" onAdd={() => { setEditTarget(null); setModalOpen(true) }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((d) => (
              <DiscoveryListCard
                key={d.id}
                discovery={d}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSave={handleSave}
                onReject={handleSkip}
                onAddToApps={handleAddToApps}
                scoring={scoreLoadingId === d.id}
                onScore={scoreDiscovery}
              />
            ))}
          </div>
        )
      )}

      <DiscoverModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editTarget}
      />
    </div>
  )
}
