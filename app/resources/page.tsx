'use client'

import { useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_COLORS,
  type Resource,
  type ResourceType,
} from '@/lib/types'
import { ResourceModal } from '@/components/ResourceModal'
import { useToast } from '@/lib/toast'
import { useHotkey } from '@/lib/hotkeys'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  onEdit,
  onDelete,
}: {
  resource: Resource
  onEdit: (r: Resource) => void
  onDelete: (id: string, title: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 transition-colors flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RESOURCE_TYPE_COLORS[resource.type]}`}>
              {RESOURCE_TYPE_LABELS[resource.type]}
            </span>
            {resource.fileName && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                {resource.fileName}
                {resource.fileSize != null && ` · ${formatSize(resource.fileSize)}`}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 leading-snug">{resource.title}</h3>
          {(resource.company || resource.role) && (
            <p className="text-xs text-zinc-500">
              {[resource.company, resource.role].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onEdit(resource)}
            className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(resource.id, resource.title)}
            className="px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tags */}
      {resource.tags.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes preview */}
      {resource.notes && (
        <>
          <div className="mx-5 border-t border-zinc-50" />
          <p className="px-5 py-3 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {resource.notes}
          </p>
        </>
      )}

      {/* Content preview */}
      {resource.contentText && !resource.notes && (
        <>
          <div className="mx-5 border-t border-zinc-50" />
          <p className="px-5 py-3 text-xs text-zinc-400 line-clamp-2 font-mono leading-relaxed">
            {resource.contentText}
          </p>
        </>
      )}

      {/* Footer */}
      <div className="mt-auto px-5 py-3 border-t border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
        <p className="text-xs text-zinc-400">Updated {timeAgo(resource.updatedAt)}</p>
        {resource.sourceUrl && (
          <a
            href={resource.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Link
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-zinc-100 rounded-full" />
          <div className="h-4 w-40 bg-zinc-100 rounded" />
        </div>
        <div className="flex gap-1">
          <div className="h-7 w-10 bg-zinc-100 rounded-lg" />
          <div className="h-7 w-14 bg-zinc-100 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 w-12 bg-zinc-100 rounded-md" />
        <div className="h-5 w-16 bg-zinc-100 rounded-md" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const { resources, addResource, updateResource, deleteResource, ready } = useStore()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Resource | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useHotkey('n', openAdd)
  useHotkey('/', () => { searchRef.current?.focus() })

  const allCompanies = useMemo(
    () => Array.from(new Set(resources.map((r) => r.company).filter(Boolean) as string[])).sort(),
    [resources],
  )

  const allTags = useMemo(
    () => Array.from(new Set(resources.flatMap((r) => r.tags))).sort(),
    [resources],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return resources.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (companyFilter !== 'all' && r.company !== companyFilter) return false
      if (tagFilter !== 'all' && !r.tags.includes(tagFilter)) return false
      if (q) {
        const hit =
          r.title.toLowerCase().includes(q) ||
          (r.company?.toLowerCase().includes(q) ?? false) ||
          (r.role?.toLowerCase().includes(q) ?? false) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          (r.contentText?.toLowerCase().includes(q) ?? false) ||
          (r.notes?.toLowerCase().includes(q) ?? false)
        if (!hit) return false
      }
      return true
    })
  }, [resources, search, typeFilter, companyFilter, tagFilter])

  const hasFilters = search !== '' || typeFilter !== 'all' || companyFilter !== 'all' || tagFilter !== 'all'

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(r: Resource) {
    setEditTarget(r)
    setModalOpen(true)
  }

  function handleSave(data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editTarget) {
      updateResource(editTarget.id, data)
      toast(`"${data.title}" updated`, 'success')
    } else {
      addResource(data)
      toast(`"${data.title}" saved`, 'success')
    }
  }

  function handleDelete(id: string, title: string) {
    if (window.confirm(`Delete "${title}"?`)) {
      deleteResource(id)
      toast(`"${title}" deleted`, 'success')
    }
  }

  function clearFilters() {
    setSearch('')
    setTypeFilter('all')
    setCompanyFilter('all')
    setTagFilter('all')
  }

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Resources</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ready
              ? `${resources.length} document${resources.length !== 1 ? 's' : ''}${hasFilters ? ` · ${filtered.length} shown` : ''}`
              : 'Loading…'}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Resource
          <kbd className="ml-1 rounded bg-blue-500 px-1.5 py-0.5 font-mono text-[10px] text-blue-100">N</kbd>
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2.5 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, company, tags, content…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ResourceType | 'all')}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="all">All Types</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>{RESOURCE_TYPE_LABELS[t]}</option>
          ))}
        </select>

        {/* Company filter */}
        {allCompanies.length > 0 && (
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Companies</option>
            {allCompanies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {!ready ? (
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-600">
            {resources.length === 0 ? 'No resources yet' : 'No results match your filters'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {resources.length === 0
              ? 'Add resumes, cover letters, job descriptions, and more.'
              : 'Try a different search or clearing the filters.'}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <ResourceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editTarget}
      />
    </div>
  )
}
