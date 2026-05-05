'use client'

import { Suspense } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  {
    id: 'find_best_resume',
    label: 'Find Best Resume Match',
    icon: '🏆',
    hint: 'auto-scores all resumes',
    instruction: '',
  },
] as const

type TaskId = (typeof TASKS)[number]['id']

// ─── Resume match types ────────────────────────────────────────────────────────

type ResourceMatch = {
  title: string
  score: number
  reasons: string[]
  missingKeywords: string[]
}

type MatchResult = {
  matches: ResourceMatch[]
  suggestedSkills: string[]
}

// ─── Small components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
      {children}
    </p>
  )
}

function CopyButton({ text, label = 'Copy Prompt' }: { text: string; label?: string }) {
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
          {label}
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
  const job = jobs.find((j) => j.id === jobId)

  // ── Special: resume match ──
  if (task.id === 'find_best_resume') {
    const docs = resources.filter((r) => r.type === 'resume' || r.type === 'cover_letter')

    lines.push('You are an expert resume screener.')
    lines.push('Compare the job description below against each provided document.')
    lines.push('Score each document 0–100 across: keyword overlap, relevant skills, role alignment, company/domain alignment.')
    lines.push('')
    lines.push('Respond ONLY with valid JSON — no markdown, no code fences, no explanation:')
    lines.push('{"matches":[{"title":"...","score":85,"reasons":["reason 1","reason 2"],"missingKeywords":["keyword1","keyword2"]}],"suggestedSkills":["skill1","skill2"]}')
    lines.push('')
    lines.push('Rules:')
    lines.push('- "matches" must include ALL documents provided, sorted by score descending')
    lines.push('- "reasons" must be 2–4 concise strings explaining why the document matched')
    lines.push('- "missingKeywords" must be 3–6 specific terms from the job description absent in the document')
    lines.push('- "suggestedSkills" must be 4–8 high-priority unique skills missing across all documents')
    lines.push('- scores must be integers 0–100')

    if (job) {
      lines.push('')
      lines.push('## Job Description')
      lines.push(`Company: ${job.company}`)
      lines.push(`Role: ${job.role}`)
      if (job.location) lines.push(`Location: ${job.location}`)
      if (job.notes) { lines.push(''); lines.push(job.notes) }
    }

    if (docs.length > 0) {
      lines.push('')
      lines.push('## Documents to Analyze')
      docs.forEach((r, i) => {
        lines.push('')
        lines.push(`### Document ${i + 1}: ${r.title} [${RESOURCE_TYPE_LABELS[r.type]}]`)
        if (r.contentText) lines.push(r.contentText)
        else if (r.notes) lines.push(r.notes)
        else lines.push('(no text content)')
      })
    }

    if (customInstructions.trim()) {
      lines.push('')
      lines.push('## Additional Context')
      lines.push(customInstructions.trim())
    }

    return lines.join('\n')
  }

  // ── Standard tasks ──
  lines.push(`# Task: ${task.label}`)
  lines.push('')
  lines.push(task.instruction)

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

function AssistantPageContent() {
  const searchParams = useSearchParams()
  const { jobs, resources, ready } = useStore()

  const [taskId, setTaskId] = useState<TaskId>('analyze_fit')
  const [jobId, setJobId] = useState('')
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set())
  const [customInstructions, setCustomInstructions] = useState('')
  const [resourceSearch, setResourceSearch] = useState('')
  const resourceSearchRef = useRef<HTMLInputElement>(null)

  const [response, setResponse] = useState('')
  const [genStatus, setGenStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const paramsApplied = useRef(false)

  useEffect(() => {
    if (!ready || paramsApplied.current) return
    paramsApplied.current = true
    const taskParam = searchParams.get('task') as TaskId | null
    const jobParam = searchParams.get('jobId')
    if (taskParam && TASKS.find((t) => t.id === taskParam)) setTaskId(taskParam)
    if (jobParam) setJobId(jobParam)
  }, [ready, searchParams])

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

  const handleGenerate = useCallback(async (builtPrompt: string, isMatchTask: boolean) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setResponse('')
    setErrorMsg('')
    setMatchResult(null)
    setGenStatus('loading')

    const ERROR_PREFIX = '__STREAM_ERROR__:'

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: builtPrompt }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const dec = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += dec.decode(value, { stream: true })
        if (!acc.startsWith(ERROR_PREFIX) && !isMatchTask) setResponse(acc)
      }

      if (acc.startsWith(ERROR_PREFIX)) {
        throw new Error(acc.slice(ERROR_PREFIX.length))
      }

      if (isMatchTask) {
        const jsonStart = acc.indexOf('{')
        const jsonEnd = acc.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          try {
            const parsed = JSON.parse(acc.slice(jsonStart, jsonEnd + 1)) as MatchResult
            setMatchResult(parsed)
          } catch {
            setResponse(acc)
          }
        } else {
          setResponse(acc)
        }
      }

      setGenStatus('done')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setGenStatus('error')
    }
  }, [])

  const prompt = useMemo(
    () => buildPrompt(task, jobId, jobs, selectedResourceIds, resources, customInstructions),
    [task, jobId, jobs, selectedResourceIds, resources, customInstructions],
  )

  const isMatchTask = taskId === 'find_best_resume'
  const resumeDocs = useMemo(
    () => resources.filter((r) => r.type === 'resume' || r.type === 'cover_letter'),
    [resources],
  )
  const matchTaskReady = isMatchTask && !!jobId && resumeDocs.length > 0
  const promptIsEmpty = !task || (isMatchTask ? !matchTaskReady : (!jobId && selectedResourceIds.size === 0 && !customInstructions.trim()))

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
                onClick={() => { setTaskId(t.id); setMatchResult(null); setResponse(''); setGenStatus('idle') }}
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
          {isMatchTask ? (
            <>
              <SectionLabel>Documents</SectionLabel>
              {resumeDocs.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  No resumes or cover letters yet.{' '}
                  <a href="/resources" className="text-blue-500 hover:underline">Add one →</a>
                </p>
              ) : (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 space-y-1">
                  <p className="text-xs font-medium text-blue-700">
                    {resumeDocs.length} document{resumeDocs.length !== 1 ? 's' : ''} will be scored automatically
                  </p>
                  {resumeDocs.map((r) => (
                    <p key={r.id} className="text-[11px] text-blue-600 truncate">
                      · {r.title}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
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

        {/* AI Response / Match Results panel */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                {isMatchTask ? 'Resume Match Results' : 'AI Response'}
              </h2>
              {genStatus === 'loading' && (
                <span className="flex items-center gap-1.5 text-xs text-blue-600">
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {isMatchTask ? 'Analyzing…' : 'Generating…'}
                </span>
              )}
              {genStatus === 'done' && <span className="text-xs text-emerald-600">Done</span>}
              {genStatus === 'error' && <span className="text-xs text-red-500">Error</span>}
            </div>
            <div className="flex items-center gap-2">
              {genStatus === 'loading' && (
                <button
                  onClick={() => { abortRef.current?.abort(); setGenStatus('idle') }}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Stop
                </button>
              )}
              {!isMatchTask && (genStatus === 'done' || response) && (
                <CopyButton text={response} label="Copy Response" />
              )}
              <button
                onClick={() => handleGenerate(prompt, isMatchTask)}
                disabled={promptIsEmpty || genStatus === 'loading'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.51 20 12 16.44 6.49 20l1.88-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69L12 3z" />
                </svg>
                {isMatchTask ? 'Analyze' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Idle / empty state */}
          {genStatus === 'idle' && !response && !matchResult && (
            <div className="px-5 py-10 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                {isMatchTask ? (
                  <span className="text-xl">🏆</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                    <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.51 20 12 16.44 6.49 20l1.88-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69L12 3z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-600">
                  {isMatchTask ? 'Ready to analyze' : 'Ready to generate'}
                </p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  {isMatchTask
                    ? 'Select a job on the left, then click Analyze. Claude will score each resume against the role.'
                    : <>Build your prompt on the left, then click Generate. Make sure{' '}
                        <code className="font-mono bg-zinc-100 px-1 rounded">ANTHROPIC_API_KEY</code>{' '}
                        is set in <code className="font-mono bg-zinc-100 px-1 rounded">.env.local</code>.</>
                  }
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {genStatus === 'error' && (
            <div className="px-5 py-6 flex items-start gap-3 bg-red-50/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-700">Failed</p>
                <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Standard response */}
          {!isMatchTask && (response || genStatus === 'loading') && (
            <pre className="px-5 py-4 text-xs text-zinc-700 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto bg-zinc-50/40">
              {response}
              {genStatus === 'loading' && (
                <span className="inline-block w-1.5 h-3.5 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </pre>
          )}

          {/* Match task loading skeleton */}
          {isMatchTask && genStatus === 'loading' && (
            <div className="px-5 py-6 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-zinc-100 p-4 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-40 bg-zinc-100 rounded" />
                    <div className="h-6 w-12 bg-zinc-100 rounded-full" />
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full" />
                  <div className="h-3 w-3/4 bg-zinc-100 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Match results */}
          {isMatchTask && matchResult && genStatus !== 'loading' && (
            <div className="px-5 py-5 space-y-4">
              {matchResult.matches.slice(0, 3).map((match, idx) => {
                const resource = resources.find(
                  (r) => r.title.toLowerCase() === match.title.toLowerCase(),
                )
                const scoreColor =
                  match.score >= 80
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : match.score >= 60
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-red-600 bg-red-50 border-red-200'
                const barColor =
                  match.score >= 80 ? 'bg-emerald-500' : match.score >= 60 ? 'bg-amber-500' : 'bg-red-400'
                const isSelected = resource && selectedResourceIds.has(resource.id)

                return (
                  <div key={idx} className="rounded-xl border border-zinc-200 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-400">#{idx + 1}</span>
                          <p className="text-sm font-semibold text-zinc-900 truncate">{match.title}</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${match.score}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${scoreColor}`}>
                            {match.score}/100
                          </span>
                        </div>
                      </div>
                      {resource && (
                        <button
                          onClick={() => toggleResource(resource.id)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          {isSelected ? '✓ In context' : 'Use this'}
                        </button>
                      )}
                    </div>

                    {match.reasons.length > 0 && (
                      <ul className="space-y-1">
                        {match.reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                            <span className="mt-0.5 text-emerald-500 shrink-0">✓</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}

                    {match.missingKeywords.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                          Missing keywords
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {match.missingKeywords.map((kw) => (
                            <span key={kw} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-100">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Suggested Missing Skills */}
              {matchResult.suggestedSkills.length > 0 && (
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <p className="text-xs font-semibold text-violet-700 mb-2">
                    Suggested Missing Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchResult.suggestedSkills.map((skill) => (
                      <span key={skill} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-violet-700 text-xs font-medium shadow-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Match task fallback: raw response if JSON parse failed */}
          {isMatchTask && !matchResult && response && genStatus !== 'loading' && (
            <pre className="px-5 py-4 text-xs text-zinc-700 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto bg-zinc-50/40">
              {response}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantPageContent />
    </Suspense>
  )
}
