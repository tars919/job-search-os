import type { Job, JobStatus } from './types'

export type ActionType =
  | 'apply_today'
  | 'apply_soon'
  | 'complete_hirevue'
  | 'complete_oa'
  | 'prep_interview'
  | 'follow_up'
  | 'tailor_resume'
  | 'research_company'
  | 'revisit'

export const ACTION_CATEGORY: Record<ActionType, 'apply' | 'interview' | 'followup' | 'stale'> = {
  apply_today: 'apply',
  apply_soon: 'apply',
  complete_hirevue: 'apply',
  complete_oa: 'apply',
  tailor_resume: 'apply',
  research_company: 'apply',
  prep_interview: 'interview',
  follow_up: 'followup',
  revisit: 'stale',
}

export interface CopilotAction {
  jobId: string
  company: string
  role: string
  status: JobStatus
  url?: string
  actionType: ActionType
  urgencyScore: number
  label: string
  why: string
}

function parseFitScore(raw: string | undefined): number | null {
  if (!raw) return null
  const s = raw.trim()
  const slashMatch = s.match(/^([\d.]+)\s*\/\s*([\d.]+)$/)
  if (slashMatch) {
    const num = parseFloat(slashMatch[1])
    const denom = parseFloat(slashMatch[2])
    if (!isNaN(num) && !isNaN(denom) && denom > 0) return (num / denom) * 100
  }
  const pctMatch = s.match(/^([\d.]+)\s*%$/)
  if (pctMatch) {
    const n = parseFloat(pctMatch[1])
    if (!isNaN(n)) return n
  }
  const n = parseFloat(s.replace(/\/.*$/, ''))
  if (!isNaN(n)) return n <= 10 ? n * 10 : n
  return null
}

function parseImportance(raw: string | undefined): 'high' | 'medium' | 'low' | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (['high', 'h', 'hi'].includes(s)) return 'high'
  if (['medium', 'med', 'm', 'mid'].includes(s)) return 'medium'
  if (['low', 'l', 'lo'].includes(s)) return 'low'
  const n = parseFloat(s.replace(/\/.*$/, ''))
  if (!isNaN(n)) {
    if (n >= 8) return 'high'
    if (n >= 5) return 'medium'
    return 'low'
  }
  return null
}

function staleDays(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000)
}

function deadlineDays(deadline: string | undefined): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
}

const SKIP_STATUSES: JobStatus[] = ['rejected', 'closed', 'offer']

export function generateActions(jobs: Job[]): CopilotAction[] {
  const actions: CopilotAction[] = []

  for (const job of jobs) {
    if (SKIP_STATUSES.includes(job.status)) continue

    const fit = parseFitScore(job.fitScore)
    const importance = parseImportance(job.importanceScore)
    const stale = staleDays(job.updatedAt)
    const ddDays = deadlineDays(job.deadline)
    const highFit = fit !== null && fit >= 75
    const highImportance = importance === 'high'
    const preApply = ['saved', 'researching', 'ready_to_apply'].includes(job.status)

    let actionType: ActionType
    let urgencyScore: number
    let label: string
    let why: string

    if (job.status === 'hirevue') {
      actionType = 'complete_hirevue'
      urgencyScore = 88
      label = `Complete HireVue for ${job.company}`
      why = `HireVue assessment is pending${stale > 0 ? ` — ${stale}d since last update` : ''}.`
    } else if (job.status === 'oa') {
      actionType = 'complete_oa'
      urgencyScore = 78
      label = `Complete OA for ${job.company}`
      why = `Online assessment is pending${stale > 0 ? ` — ${stale}d since last update` : ''}.`
    } else if (preApply && ddDays !== null && ddDays <= 2) {
      actionType = 'apply_today'
      urgencyScore = 97
      const when = ddDays <= 0 ? 'today' : ddDays === 1 ? 'tomorrow' : `in ${ddDays} days`
      label = `Apply to ${job.company} — deadline ${when}`
      why = `Deadline is ${when}.${highFit ? ` Fit: ${job.fitScore}.` : ''}${highImportance ? ` High importance.` : ''}`
    } else if (preApply && ddDays !== null && ddDays <= 7) {
      actionType = 'apply_soon'
      urgencyScore = 82
      label = `Apply to ${job.company} — deadline in ${ddDays}d`
      why = `Deadline in ${ddDays} days.${highFit ? ` Fit: ${job.fitScore}.` : ''}${highImportance ? ` High importance.` : ''}`
    } else if (job.status === 'final_round') {
      actionType = 'prep_interview'
      urgencyScore = 75
      label = `Prep for final round at ${job.company}`
      why = `Final round in progress — prioritize interview prep.${stale > 3 ? ` ${stale}d since update.` : ''}`
    } else if (job.status === 'interview') {
      actionType = 'prep_interview'
      urgencyScore = 68
      label = `Prep interview answers for ${job.company}`
      why = `Interview stage — use the AI assistant to practice.${stale > 3 ? ` ${stale}d since update.` : ''}`
    } else if (['applied', 'recruiter_screen'].includes(job.status) && stale >= 7) {
      actionType = 'follow_up'
      urgencyScore = Math.min(65, 42 + Math.floor(stale * 1.3))
      label = `Follow up with ${job.company} — ${stale}d no update`
      why = `${stale} days since last update. A short follow-up can keep you visible.`
    } else if (preApply && (highFit || highImportance)) {
      actionType = 'tailor_resume'
      urgencyScore = 52
      label = `Tailor resume for ${job.company} — ${job.role}`
      const parts: string[] = []
      if (highFit) parts.push(`Fit: ${job.fitScore}`)
      if (highImportance) parts.push(`Importance: ${job.importanceScore}`)
      why = parts.join('. ') + '. Worth customizing before applying.'
    } else if (job.status === 'researching') {
      actionType = 'research_company'
      urgencyScore = 38
      label = `Research ${job.company} before applying`
      why = `Still in research phase. Add notes to your tracker before moving forward.`
    } else if (stale >= 14) {
      actionType = 'revisit'
      urgencyScore = Math.min(55, 28 + Math.floor(stale * 0.8))
      label = `Revisit ${job.company} — ${stale}d no update`
      why = `No activity in ${stale} days. Update the status or mark closed.`
    } else {
      continue
    }

    if (job.priority === 'high') urgencyScore = Math.min(100, urgencyScore + 8)
    if (highImportance) urgencyScore = Math.min(100, urgencyScore + 4)
    if (highFit) urgencyScore = Math.min(100, urgencyScore + 2)

    actions.push({
      jobId: job.id,
      company: job.company,
      role: job.role,
      status: job.status,
      url: job.url,
      actionType,
      urgencyScore: Math.round(urgencyScore),
      label,
      why,
    })
  }

  return actions.sort((a, b) => b.urgencyScore - a.urgencyScore)
}
