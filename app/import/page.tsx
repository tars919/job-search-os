'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { useStore } from '@/lib/store'
import { STATUS_LABELS, type Job, type JobStatus } from '@/lib/types'

// ─── CSV → Job mapping ────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, JobStatus> = {
  applied: 'applied',
  interview: 'interview',
  rejected: 'rejected',
  saved: 'saved',
  researching: 'researching',
  offer: 'offer',
  closed: 'closed',
  'ready to apply': 'ready_to_apply',
  ready_to_apply: 'ready_to_apply',
  oa: 'oa',
  hirevue: 'hirevue',
  'hirevue done': 'hirevue',
  'recruiter screen': 'recruiter_screen',
  recruiter_screen: 'recruiter_screen',
  'final round': 'final_round',
  final_round: 'final_round',
  // real-world variants
  'not started': 'saved',
  denied: 'rejected',
  'interview round 1': 'interview',
  'interview round 2': 'interview',
  'interview round 3': 'interview',
  'interview round 4': 'final_round',
  'interview round 5': 'final_round',
}

function normalizeStatus(raw: string): JobStatus {
  return STATUS_MAP[raw.trim().toLowerCase()] ?? 'saved'
}

function normalizeDate(raw: string): string | undefined {
  if (!raw.trim()) return undefined
  // Try to parse common formats and emit YYYY-MM-DD
  const d = new Date(raw.trim())
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  return undefined
}

function dupKey(company: string, role: string, url: string): string {
  return `${company.trim().toLowerCase()}||${role.trim().toLowerCase()}||${url.trim().toLowerCase()}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedRow = Omit<Job, 'id' | 'createdAt' | 'updatedAt'>

interface PreviewRow {
  parsed: ParsedRow
  skip: boolean
  skipReason?: string
  raw: Record<string, string>
}

// ─── Row parser ───────────────────────────────────────────────────────────────

function parseRow(raw: Record<string, string>, headers: string[]): ParsedRow {
  function get(name: string): string {
    const key = headers.find((h) => h.trim().toLowerCase() === name.toLowerCase())
    return key != null ? (raw[key] ?? '').trim() : ''
  }

  // "Date" header or blank second column — both mean appliedAt
  const dateColKey =
    headers.find((h) => h.trim().toLowerCase() === 'date') ?? headers[1] ?? ''
  const appliedAtRaw = (raw[dateColKey] ?? '').trim()

  return {
    company: get('company'),
    role: get('title'),
    status: normalizeStatus(get('status')),
    url: get('link') || undefined,
    location: get('location') || undefined,
    fitScore: get('fit score') || undefined,
    importanceScore: get('importance') || undefined,
    notes: get('notes') || undefined,
    appliedAt: normalizeDate(appliedAtRaw),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Stage = 'idle' | 'preview' | 'done'

export default function ImportPage() {
  const { jobs, bulkAddJobs } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('idle')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<{ added: number; duplicates: number; invalid: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File) {
    setError(null)
    setResult(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.data.length) {
          setError('The CSV appears to be empty.')
          return
        }

        const headers = results.meta.fields ?? []
        const existingKeys = new Set(jobs.map((j) => dupKey(j.company, j.role, j.url ?? '')))

        const preview: PreviewRow[] = results.data.map((raw) => {
          const parsed = parseRow(raw, headers)
          const key = dupKey(parsed.company, parsed.role, parsed.url ?? '')
          const missingRequired = !parsed.company.trim() || !parsed.role.trim()

          let skip = false
          let skipReason: string | undefined

          if (missingRequired) {
            skip = true
            skipReason = 'Missing company or role'
          } else if (existingKeys.has(key)) {
            skip = true
            skipReason = 'Duplicate'
          }

          return { parsed, skip, skipReason, raw }
        })

        setRows(preview)
        setStage('preview')
      },
      error(err) {
        setError(`Parse error: ${err.message}`)
      },
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleImport() {
    const toAdd = rows.filter((r) => !r.skip).map((r) => r.parsed)
    bulkAddJobs(toAdd)
    setResult({
      added: toAdd.length,
      duplicates: rows.filter((r) => r.skipReason === 'Duplicate').length,
      invalid: rows.filter((r) => r.skipReason === 'Missing company or role').length,
    })
    setStage('done')
  }

  function reset() {
    setStage('idle')
    setRows([])
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const toAdd = rows.filter((r) => !r.skip).length
  const toDuplicates = rows.filter((r) => r.skipReason === 'Duplicate').length
  const toInvalid = rows.filter((r) => r.skipReason === 'Missing company or role').length

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Import CSV</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Supports: Status, [applied date], Importance, Fit score, Title, NOTES, Company, Location, Link
        </p>
      </div>

      {/* ── Idle / drop zone ── */}
      {stage === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-20 px-8 text-center hover:border-blue-300 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700">Drop your CSV here</p>
            <p className="text-xs text-zinc-400 mt-0.5">or click to browse</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      )}

      {/* ── Preview ── */}
      {stage === 'preview' && (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-zinc-500">
                <span className="font-semibold text-zinc-900">{rows.length}</span> rows parsed
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="font-semibold">{toAdd}</span> will be added
              </span>
              {toDuplicates > 0 && (
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-300 inline-block" />
                  <span className="font-semibold">{toDuplicates}</span> duplicates
                </span>
              )}
              {toInvalid > 0 && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-300 inline-block" />
                  <span className="font-semibold">{toInvalid}</span> invalid
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={toAdd === 0}
                className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Import {toAdd > 0 ? `${toAdd} row${toAdd !== 1 ? 's' : ''}` : ''}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Applied</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Importance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Fit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide w-28">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={row.skip ? 'opacity-40' : 'hover:bg-zinc-50/60 transition-colors'}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                        {row.parsed.company || <span className="text-red-400 italic">missing</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[200px]">
                        <span className="block truncate" title={row.parsed.role}>
                          {row.parsed.role || <span className="text-red-400 italic">missing</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {STATUS_LABELS[row.parsed.status]}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {row.parsed.appliedAt ?? <span className="text-zinc-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap max-w-[120px]">
                        <span className="block truncate">{row.parsed.importanceScore ?? <span className="text-zinc-200">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {row.parsed.fitScore ?? <span className="text-zinc-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {row.parsed.location ?? <span className="text-zinc-200">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.skip ? (
                          <span className="text-xs text-zinc-400">{row.skipReason}</span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600">Add</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {stage === 'done' && result && (
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-200 bg-white py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900">Import complete</p>
              <p className="text-sm text-zinc-400 mt-1 flex items-center justify-center gap-3 flex-wrap">
                <span className="text-emerald-700 font-medium">{result.added} added</span>
                {result.duplicates > 0 && (
                  <span>{result.duplicates} duplicate{result.duplicates !== 1 ? 's' : ''} skipped</span>
                )}
                {result.invalid > 0 && (
                  <span className="text-red-400">{result.invalid} invalid skipped</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Import another file
              </button>
              <a
                href="/applications"
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                View Applications
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
