'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import type { PromptEntry } from '@/lib/types'
import { PromptModal } from '@/components/PromptModal'

// ─── Copy button with feedback ────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 1800)
    } catch {
      // clipboard not available (e.g. non-secure context)
    }
  }

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        state === 'copied'
          ? 'bg-green-50 text-green-700'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
      }`}
    >
      {state === 'copied' ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

// ─── Prompt card ──────────────────────────────────────────────────────────────

function PromptCard({
  prompt,
  onEdit,
  onDelete,
}: {
  prompt: PromptEntry
  onEdit: (p: PromptEntry) => void
  onDelete: (id: string, title: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = prompt.body.length > 200

  return (
    <div className="bg-white rounded-xl border border-zinc-200 flex flex-col hover:border-zinc-300 transition-colors">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="space-y-2 min-w-0">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {prompt.category}
          </span>
          <h3 className="text-sm font-semibold text-zinc-900 leading-snug">
            {prompt.title}
          </h3>
        </div>
        <CopyButton text={prompt.body} />
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-zinc-50" />

      {/* Body */}
      <div className="px-5 py-4 flex-1">
        {expanded ? (
          <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-600 leading-relaxed">
            {prompt.body}
          </pre>
        ) : (
          <p className="text-sm text-zinc-500 leading-relaxed line-clamp-4">
            {prompt.body}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 pb-4 pt-2">
        {isLong ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1"
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {expanded ? 'Collapse' : 'Show full'}
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(prompt)}
            className="px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(prompt.id, prompt.title)}
            className="px-2 py-1 rounded-md text-xs font-medium text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromptsPage() {
  const { prompts, addPrompt, updatePrompt, deletePrompt, ready } = useStore()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PromptEntry | null>(null)

  const categories = useMemo(() => {
    const unique = Array.from(new Set(prompts.map((p) => p.category))).sort()
    return ['All', ...unique]
  }, [prompts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return prompts.filter((p) => {
      if (activeCategory !== 'All' && p.category !== activeCategory) return false
      if (q) {
        const hit =
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    })
  }, [prompts, search, activeCategory])

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(p: PromptEntry) {
    setEditTarget(p)
    setModalOpen(true)
  }

  function handleSave(data: Omit<PromptEntry, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editTarget) {
      updatePrompt(editTarget.id, data)
    } else {
      addPrompt(data)
    }
  }

  function handleDelete(id: string, title: string) {
    if (window.confirm(`Delete "${title}"?`)) {
      deletePrompt(id)
    }
  }

  const existingCategories = useMemo(
    () => Array.from(new Set(prompts.map((p) => p.category))).sort(),
    [prompts],
  )

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Prompt Library</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ready
              ? `${prompts.length} template${prompts.length !== 1 ? 's' : ''}`
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
          New Prompt
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm mb-4">
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
          placeholder="Search prompts…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Category pills ── */}
      {ready && categories.length > 1 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
              }`}
            >
              {cat}
              {cat !== 'All' && (
                <span className={`ml-1.5 tabular-nums ${activeCategory === cat ? 'text-blue-200' : 'text-zinc-400'}`}>
                  {prompts.filter((p) => p.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Cards ── */}
      {!ready ? (
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3 animate-pulse">
              <div className="h-5 w-20 bg-zinc-100 rounded-full" />
              <div className="h-4 w-40 bg-zinc-100 rounded" />
              <div className="space-y-2">
                <div className="h-3 bg-zinc-100 rounded w-full" />
                <div className="h-3 bg-zinc-100 rounded w-4/5" />
                <div className="h-3 bg-zinc-100 rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-600">
            {prompts.length === 0 ? 'No prompts yet' : 'No matching prompts'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {prompts.length === 0
              ? 'Click "New Prompt" to save your first outreach template.'
              : 'Try a different search or category.'}
          </p>
          {(search || activeCategory !== 'All') && (
            <button
              onClick={() => { setSearch(''); setActiveCategory('All') }}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PromptModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editTarget}
        existingCategories={existingCategories}
      />
    </div>
  )
}
