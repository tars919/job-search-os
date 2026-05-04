'use client'

import { useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import {
  STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_COLORS,
  ACTIVE_STATUSES,
  type Resource,
} from '@/lib/types'

// ─── Task definitions ─────────────────────────────────────────────────────────

const TASKS = [
  {
    id: 'analyze_fit',
    label: 'Analyze Job Fit',
    icon: '🎯',
    hint: 'resume · job description',
    instruction:
      'You are a career coach. Analyze how well the candidate fits the provided job description based on their resume and background. Highlight strengths, gaps, and give an overall fit score out of 10 with a brief rationale.',
  },
  {
    id: 'tailor_bullets',
    label: 'Tailor Resume Bullets',
    icon: '✏️',
    hint: 'resume · job description',
    instruction:
      'You are a resume writing expert. Review the job description and the candidate\'s resume, then suggest 6–8 tailored bullet points that align with the role\'s requirements. Use strong action verbs and quantified achievements where possible.',
  },
  {
    id: 'draft_cover_letter',
    label: 'Draft Cover Letter',
    icon: '📄',
    hint: 'resume · cover letter',
    instruction:
      'You are a professional cover letter writer. Draft a compelling, concise cover letter (3–4 paragraphs) tailored to the job description and the candidate\'s background. Keep a professional but personable tone. Do not include a date or address header.',
  },
  {
    id: 'draft_recruiter_message',
    label: 'Draft Recruiter Message',
    icon: '💬',
    hint: 'resume · recruiter email',
    instruction:
      'You are an expert at professional outreach. Write a short, direct cold message (under 150 words) to a recruiter or hiring manager. Be specific, reference the role and company, and end with a clear ask.',
  },
  {
    id: 'prep_interview',
    label: 'Prep Interview Answers',
    icon: '🎤',
    hint: 'resume · job description',
    instruction:
      'You are an interview coach. Based on the job description and the candidate\'s background, suggest 5 likely interview questions and strong model answers. Include at least one behavioral (STAR format) question and one role-specific question.',
  },
  {
    id: 'summarize_research',
    label: 'Summarize Company Research',
    icon: '🔍',
    hint: 'research notes · job description',
    instruction:
      'You are a research analyst helping a job candidate prepare for an interview. Summarize the key points from the company research provided. Focus on mission, culture, tech stack, recent news, and anything relevant to a job interview. End with 3 smart questions the candidate could ask.',
  },
] as const

type TaskId = (typeof TASKS)[number]['id']

// ─── Small components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
      {children}
    </p>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      onClick={copy}
      disabled={!text}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        copied
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
      }`}
    >
      {copied ? (
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
          Copy Prompt
        </>
      )}
    </button>
  )
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  task: (typeof TASKS)[number] | undefined,
  jobId: string,
  jobs: ReturnType<typeof useStore>['jobs'],
  selectedResourceIds: Set<string>,
  resources: Resource[],
  customInstructions: string,
): string {
  if (!task) return ''

  const lines: string[] = []

  lines.push(`# Task: ${task.label}`)
  lines.push('')
  lines.push(task.instruction)

  const job = jobs.find((j) => j.id === jobId)
  if (job) {
    lines.push('')
    lines.push('---')
    lines.push('## Application')
    lines.push(`Company: ${job.company}`)
    lines.push(`Role: ${job.role}`)
    lines.push(`Status: ${STATUS_LABELS[job.status]}`)
    if (job.location) lines.push(`Location: ${job.location}`)
    if (job.url) lines.push(`Job URL: ${job.url}`)
    if (job.notes) {
      lines.push('')
      lines.push('### Job Notes')
      lines.push(job.notes)
    }
  }

  const chosen = resources.filter((r) => selectedResourceIds.has(r.id))
  if (chosen.length > 0) {
    lines.push('')
    lines.push('---')
    lines.push('## Resources')
    chosen.forEach((r) => {
      lines.push('')
      lines.push(`### ${r.title} [${RESOURCE_TYPE_LABELS[r.type]}]`)
      if (r.company || r.role) {
        lines.push(`_${[r.company, r.role].filter(Boolean).join(' · ')}_`)
      }
      if (r.contentText) lines.push(r.contentText)
      else if (r.notes) lines.push(r.notes)
      else lines.push('(no text content — add content in Resources)')
    })
  }

  if (customInstructions.trim()) {
    lines.push('')
    lines.push('---')
    lines.push('## Custom Instructions')
    lines.push(customInstructions.trim())
  }

  return lines.join('\n')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { jobs, resources, ready } = useStore()

  const [taskId, setTaskId] = useState<TaskId>('analyze_fit')
  const [jobId, setJobId] = useState('')
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set())
  const [customInstructions, setCustomInstructions] = useState('')
  const [resourceSearch, setResourceSearch] = useState('')
  const resourceSearchRef = useRef<HTMLInputElement>(null)

  const task = TASKS.find((t) => t.id === taskId)

  // Sort jobs: active pipeline first, then by company name
  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const aActive = ACTIVE_STATUSES.includes(a.status) ? 0 : 1
        const bActive = ACTIVE_STATUSES.includes(b.status) ? 0 : 1
        if (aActive !== bActive) return aActive - bActive
        return a.company.localeCompare(b.company)
      }),
    [jobs],
  )

  const filteredResources = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase()
    if (!q) return resources
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.type.includes(q) ||
        RESOURCE_TYPE_LABELS[r.type].toLowerCase().includes(q) ||
        (r.company?.toLowerCase().includes(q) ?? false),
    )
  }, [resources, resourceSearch])

  // Group resources by type for display
  const groupedResources = useMemo(() => {
    const groups: Partial<Record<string, Resource[]>> = {}
    filteredResources.forEach((r) => {
      const label = RESOURCE_TYPE_LABELS[r.type]
      if (!groups[label]) groups[label] = []
      groups[label]!.push(r)
    })
    return groups
  }, [filteredResources])

  function toggleResource(id: string) {
    setSelectedResourceIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const prompt = useMemo(
    () => buildPrompt(task, jobId, jobs, selectedResourceIds, resources, customInstructions),
    [task, jobId, jobs, selectedResourceIds, resources, customInstructions],
  )

  const promptIsEmpty = !task || (!jobId && selectedResourceIds.size === 0 && !customInstructions.trim())

  if (!ready) {
    return (
      <div className="p-8">
        <div className="h-7 w-40 bg-zinc-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-zinc-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-8 flex gap-6 items-start min-h-full">
      {/* ── Left: Configuration panel ── */}
      <div className="w-80 shrink-0 space-y-6 sticky top-8 self-start">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">AI Assistant</h1>
          <p className="mt-1 text-sm text-zinc-400">Build a prompt from your job search data.</p>
        </div>

        {/* Task selector */}
        <div>
          <SectionLabel>Task</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {TASKS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTaskId(t.id)}
                className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  taskId === t.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <span className="block mb-0.5">{t.icon} {t.label}</span>
                <span className={`font-normal text-[10px] ${taskId === t.id ? 'text-blue-200' : 'text-zinc-400'}`}>
                  {t.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Application picker */}
        <div>
          <SectionLabel>Application</SectionLabel>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="">None selected</option>
            {sortedJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} — {j.role} ({STATUS_LABELS[j.status]})
              </option>
            ))}
          </select>
          {jobs.length === 0 && (
            <p className="mt-1.5 text-xs text-zinc-400">
              No applications yet.{' '}
              <a href="/applications" className="text-blue-500 hover:underline">Add one →</a>
            </p>
          )}
        </div>

        {/* Resource picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Resources</SectionLabel>
            {selectedResourceIds.size > 0 && (
              <button
                onClick={() => setSelectedResourceIds(new Set())}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Clear {selectedResourceIds.size} selected
              </button>
            )}
          </div>

          {resources.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No resources yet.{' '}
              <a href="/resources" className="text-blue-500 hover:underline">Add one →</a>
            </p>
          ) : (
            <>
              {/* Resource search */}
              <div className="relative mb-2">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={resourceSearchRef}
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Filter resources…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {/* Resource list */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {Object.entries(groupedResources).map(([groupLabel, items]) => (
                  <div key={groupLabel}>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {groupLabel}
                    </p>
                    <div className="space-y-1">
                      {items!.map((r) => (
                        <label
                          key={r.id}
                          className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                            selectedResourceIds.has(r.id)
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-zinc-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedResourceIds.has(r.id)}
                            onChange={() => toggleResource(r.id)}
                            className="mt-0.5 shrink-0 accent-blue-600"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-900 truncate leading-snug">
                              {r.title}
                            </p>
                            {r.company && (
                              <p className="text-[10px] text-zinc-400 truncate">{r.company}</p>
                            )}
                            {!r.contentText && !r.notes && (
                              <p className="text-[10px] text-amber-500">no text content</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredResources.length === 0 && (
                  <p className="text-xs text-zinc-400 py-2">No resources match.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Custom instructions */}
        <div>
          <SectionLabel>Custom Instructions</SectionLabel>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Any specific asks, context, or constraints…"
            rows={3}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
          />
        </div>
      </div>

      {/* ── Right: Output panel ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Generated prompt */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Generated Prompt</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {promptIsEmpty
                  ? 'Select a task and at least one data source to build your prompt.'
                  : `${prompt.length.toLocaleString()} characters · ready to copy`}
              </p>
            </div>
            <CopyButton text={prompt} />
          </div>

          {promptIsEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-600">No prompt yet</p>
              <p className="text-xs text-zinc-400 mt-1">
                Pick a task, then select a job or resource from the left panel.
              </p>
            </div>
          ) : (
            <pre className="px-5 py-4 text-xs text-zinc-700 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto bg-zinc-50/40">
              {prompt}
            </pre>
          )}
        </div>

        {/* Context summary chips */}
        {!promptIsEmpty && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400">Context:</span>
            {task && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {task.icon} {task.label}
              </span>
            )}
            {jobId && (() => {
              const j = jobs.find((j) => j.id === jobId)
              return j ? (
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                  {j.company} · {j.role}
                </span>
              ) : null
            })()}
            {Array.from(selectedResourceIds).map((id) => {
              const r = resources.find((r) => r.id === id)
              return r ? (
                <span
                  key={id}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RESOURCE_TYPE_COLORS[r.type]}`}
                >
                  {r.title}
                </span>
              ) : null
            })}
            {customInstructions.trim() && (
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                + custom instructions
              </span>
            )}
          </div>
        )}

        {/* Placeholder response panel */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">AI Response</h2>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Coming soon
            </span>
          </div>
          <div className="px-5 py-10 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700">LLM API integration coming next.</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                For now, copy the generated prompt and paste it into Claude, ChatGPT, or any LLM of your choice.
                When the API is wired up, responses will appear here automatically.
              </p>
            </div>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Open Claude
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
