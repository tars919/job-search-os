'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  OUTREACH_STATUSES,
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUS_COLORS,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_TYPE_COLORS,
  OUTREACH_CHANNELS,
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_CHANNEL_COLORS,
  type Outreach,
  type OutreachChannel,
  type OutreachStatus,
  type RelationshipType,
} from '@/lib/types'
import { OutreachModal } from '@/components/OutreachModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}

function daysAgo(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function followUpLabel(dateStr: string | undefined): { text: string; color: string } | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, color: 'text-red-600' }
  if (diff === 0) return { text: 'Due today', color: 'text-red-600' }
  if (diff === 1) return { text: 'Due tomorrow', color: 'text-amber-600' }
  if (diff <= 7) return { text: `Due in ${diff}d`, color: 'text-amber-500' }
  const fmt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { text: `Due ${fmt}`, color: 'text-zinc-400' }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  outreach: Outreach
  onEdit: (o: Outreach) => void
  onDelete: (id: string) => void
  onGenerateMessage: (o: Outreach) => void
}

function OutreachCard({ outreach: o, onEdit, onDelete, onGenerateMessage }: CardProps) {
  const fu = followUpLabel(o.followUpDate)

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors group">
      {/* Avatar */}
      <div
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${RELATIONSHIP_TYPE_COLORS[o.relationshipType]}`}
      >
        {initials(o.personName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-zinc-900">{o.personName}</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${RELATIONSHIP_TYPE_COLORS[o.relationshipType]}`}
          >
            {RELATIONSHIP_TYPE_LABELS[o.relationshipType]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs font-medium text-zinc-600">{o.company}</span>
          {o.role && (
            <>
              <span className="text-zinc-300 text-xs">·</span>
              <span className="text-xs text-zinc-400 truncate max-w-[200px]">{o.role}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${OUTREACH_CHANNEL_COLORS[o.channel]}`}
          >
            {OUTREACH_CHANNEL_LABELS[o.channel]}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${OUTREACH_STATUS_COLORS[o.status]}`}
          >
            {OUTREACH_STATUS_LABELS[o.status]}
          </span>
          <span className="text-xs text-zinc-400">
            contacted {daysAgo(o.lastContactedAt ?? o.updatedAt)}
          </span>
          {fu && (
            <span className={`text-xs font-medium ${fu.color}`}>{fu.text}</span>
          )}
        </div>
        {o.notes && (
          <p className="mt-1.5 text-xs text-zinc-400 line-clamp-1">{o.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onGenerateMessage(o)}
          title="Draft message with AI"
          className="p-2 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
        >
          <IconChat />
        </button>
        <button
          onClick={() => onEdit(o)}
          title="Edit"
          className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <IconEdit />
        </button>
        <button
          onClick={() => onDelete(o.id)}
          title="Delete"
          className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const { outreach, ready, addOutreach, updateOutreach, deleteOutreach, jobs } = useStore()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OutreachStatus | 'all'>('all')
  const [channelFilter, setChannelFilter] = useState<OutreachChannel | 'all'>('all')
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Outreach | null>(null)

  // Follow-ups due within the next 7 days (including overdue)
  const followUpsDue = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cutoff = new Date(today.getTime() + 7 * 86_400_000)
    return outreach
      .filter((o) => {
        if (o.status === 'closed' || o.status === 'replied') return false
        if (!o.followUpDate) return false
        const d = new Date(o.followUpDate + 'T00:00:00')
        return d <= cutoff
      })
      .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!))
  }, [outreach])

  const filtered = useMemo(() => {
    const today = todayStr()
    return outreach
      .filter((o) => {
        if (search) {
          const q = search.toLowerCase()
          if (
            !o.personName.toLowerCase().includes(q) &&
            !o.company.toLowerCase().includes(q)
          ) return false
        }
        if (statusFilter !== 'all' && o.status !== statusFilter) return false
        if (channelFilter !== 'all' && o.channel !== channelFilter) return false
        if (relationshipFilter !== 'all' && o.relationshipType !== relationshipFilter) return false
        return true
      })
      .sort((a, b) => {
        const aUrgent =
          a.status === 'follow_up_needed' || (!!a.followUpDate && a.followUpDate <= today)
        const bUrgent =
          b.status === 'follow_up_needed' || (!!b.followUpDate && b.followUpDate <= today)
        if (aUrgent && !bUrgent) return -1
        if (!aUrgent && bUrgent) return 1
        if (a.followUpDate && b.followUpDate) return a.followUpDate.localeCompare(b.followUpDate)
        if (a.followUpDate) return -1
        if (b.followUpDate) return 1
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [outreach, search, statusFilter, channelFilter, relationshipFilter])

  const hasFilters =
    search !== '' || statusFilter !== 'all' || channelFilter !== 'all' || relationshipFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setChannelFilter('all')
    setRelationshipFilter('all')
  }

  function handleSave(data: Omit<Outreach, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editing) {
      updateOutreach(editing.id, data)
    } else {
      addOutreach(data)
    }
    setModalOpen(false)
    setEditing(null)
  }

  function handleEdit(o: Outreach) {
    setEditing(o)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this outreach entry?')) deleteOutreach(id)
  }

  function handleAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function handleGenerateMessage(o: Outreach) {
    const params = new URLSearchParams({ task: 'draft_recruiter_message' })
    if (o.relatedJobId) params.set('jobId', o.relatedJobId)
    router.push(`/assistant?${params}`)
  }

  if (!ready) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Outreach</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {outreach.length === 0
                ? 'Track recruiters, referrals, and networking contacts.'
                : `${outreach.length} contact${outreach.length !== 1 ? 's' : ''} tracked`}
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IconPlus />
            Add Outreach
          </button>
        </div>

        {/* Follow-ups due this week */}
        {followUpsDue.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
              Follow-ups Due · {followUpsDue.length} pending
            </h2>
            <div className="space-y-2">
              {followUpsDue.map((o) => {
                const fu = followUpLabel(o.followUpDate)
                return (
                  <div key={o.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-zinc-900 truncate">
                        {o.personName}
                      </span>
                      <span className="text-xs text-zinc-500 shrink-0">at {o.company}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {fu && (
                        <span className={`text-xs font-medium ${fu.color}`}>{fu.text}</span>
                      )}
                      <button
                        onClick={() => handleEdit(o)}
                        className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
              <IconSearch />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people or companies…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OutreachStatus | 'all')}
            className="px-3 py-2 text-sm rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-zinc-700"
          >
            <option value="all">All Statuses</option>
            {OUTREACH_STATUSES.map((s) => (
              <option key={s} value={s}>{OUTREACH_STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as OutreachChannel | 'all')}
            className="px-3 py-2 text-sm rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-zinc-700"
          >
            <option value="all">All Channels</option>
            {OUTREACH_CHANNELS.map((c) => (
              <option key={c} value={c}>{OUTREACH_CHANNEL_LABELS[c]}</option>
            ))}
          </select>

          <select
            value={relationshipFilter}
            onChange={(e) => setRelationshipFilter(e.target.value as RelationshipType | 'all')}
            className="px-3 py-2 text-sm rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-zinc-700"
          >
            <option value="all">All Relationships</option>
            {RELATIONSHIP_TYPES.map((r) => (
              <option key={r} value={r}>{RELATIONSHIP_TYPE_LABELS[r]}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-zinc-600 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Content */}
        {outreach.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-zinc-400"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-base font-medium text-zinc-600">No outreach yet</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">
              Add recruiters, employees, and referrals to track your networking efforts.
            </p>
            <button
              onClick={handleAdd}
              className="mt-5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add your first contact
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-zinc-400">No results match your filters.</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <OutreachCard
                key={o.id}
                outreach={o}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGenerateMessage={handleGenerateMessage}
              />
            ))}
          </div>
        )}
      </div>

      <OutreachModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        initialData={editing}
        jobs={jobs}
      />
    </>
  )
}
