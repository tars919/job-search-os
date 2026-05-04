'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { STATUS_LABELS, STATUS_COLORS, type ResearchNote } from '@/lib/types'
import { NoteModal } from '@/components/NoteModal'

// ─── Lightweight markdown renderer ───────────────────────────────────────────
// Handles: ## headings, **bold**, - / * bullets, blank lines

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-zinc-800">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <p key={i} className="font-semibold text-zinc-900 mt-4 mb-1 first:mt-0 text-[13px] uppercase tracking-wide">
              {line.slice(3)}
            </p>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <p key={i} className="font-semibold text-zinc-800 mt-3 mb-0.5">
              {line.slice(4)}
            </p>
          )
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-[7px] w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
              <span className="text-zinc-600">{renderInline(line.slice(2))}</span>
            </div>
          )
        }
        if (line === '') {
          return <div key={i} className="h-2" />
        }
        return (
          <p key={i} className="text-zinc-600">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: ResearchNote
  onEdit: (n: ResearchNote) => void
  onDelete: (id: string, company: string) => void
}) {
  const { jobs } = useStore()
  const linkedJob = note.jobId ? jobs.find((j) => j.id === note.jobId) : null

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 transition-colors">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div className="space-y-2 min-w-0">
          <h3 className="text-base font-semibold text-zinc-900 leading-snug">
            {note.company}
          </h3>
          {linkedJob && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[linkedJob.status]}`}
            >
              <svg
                width="9" height="9" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                className="shrink-0"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {linkedJob.role} · {STATUS_LABELS[linkedJob.status]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onEdit(note)}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(note.id, note.company)}
            className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-zinc-100" />

      {/* Content */}
      <div className="px-6 py-5">
        <MarkdownContent text={note.content} />
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-zinc-50 bg-zinc-50/50">
        <p className="text-xs text-zinc-400">Updated {timeAgo(note.updatedAt)}</p>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-5 w-28 bg-zinc-100 rounded" />
          <div className="h-4 w-40 bg-zinc-100 rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-12 bg-zinc-100 rounded-lg" />
          <div className="h-7 w-14 bg-zinc-100 rounded-lg" />
        </div>
      </div>
      <div className="border-t border-zinc-100" />
      <div className="space-y-2">
        <div className="h-3 bg-zinc-100 rounded w-24" />
        <div className="h-3 bg-zinc-100 rounded w-full" />
        <div className="h-3 bg-zinc-100 rounded w-5/6" />
        <div className="h-3 bg-zinc-100 rounded w-full" />
        <div className="h-3 bg-zinc-100 rounded w-4/5" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const { notes, jobs, addNote, updateNote, deleteNote, ready } = useStore()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ResearchNote | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.company.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    )
  }, [notes, search])

  const companySuggestions = useMemo(() => {
    const fromNotes = notes.map((n) => n.company)
    const fromJobs = jobs.map((j) => j.company)
    return Array.from(new Set([...fromNotes, ...fromJobs])).sort()
  }, [notes, jobs])

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(note: ResearchNote) {
    setEditTarget(note)
    setModalOpen(true)
  }

  function handleSave(data: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editTarget) {
      updateNote(editTarget.id, data)
    } else {
      addNote(data)
    }
  }

  function handleDelete(id: string, company: string) {
    if (window.confirm(`Delete research note for ${company}?`)) {
      deleteNote(id)
    }
  }

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Research Notes</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ready
              ? `${notes.length} note${notes.length !== 1 ? 's' : ''}${
                  search ? ` · ${filtered.length} shown` : ''
                }`
              : 'Loading…'}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Note
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or notes…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
            aria-label="Clear"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {!ready ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-600">
            {notes.length === 0 ? 'No research notes yet' : 'No notes match your search'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {notes.length === 0
              ? 'Add company research, interview prep, and talking points.'
              : 'Try a different search term.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <NoteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editTarget}
        jobs={jobs}
        companySuggestions={companySuggestions}
      />
    </div>
  )
}
