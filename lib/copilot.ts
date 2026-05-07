import type { Job, JobStatus, Outreach, OutreachStatus, InterviewPrep, CalendarEvent, EmailMessage } from './types'
import { OUTREACH_STATUS_LABELS, ROUND_TYPE_LABELS, EVENT_TYPE_LABELS, EMAIL_TYPE_LABELS } from './types'

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
  | 'follow_up_outreach'
  | 'prep_due'
  | 'event_due'
  | 'email_action'

export const ACTION_CATEGORY: Record<ActionType, 'apply' | 'interview' | 'followup' | 'stale'> = {
  apply_today: 'apply',
  apply_soon: 'apply',
  complete_hirevue: 'apply',
  complete_oa: 'apply',
  tailor_resume: 'apply',
  research_company: 'apply',
  prep_interview: 'interview',
  follow_up: 'followup',
  follow_up_outreach: 'followup',
  revisit: 'stale',
  prep_due: 'interview',
  event_due: 'followup',
  email_action: 'followup',
}

export interface CopilotAction {
  jobId: string           // '' for outreach/interview-only actions
  outreachId?: string     // set for follow_up_outreach actions
  interviewId?: string    // set for prep_due actions
  eventId?: string        // set for event_due actions
  emailId?: string        // set for email_action actions
  company: string
  role: string
  status?: JobStatus      // undefined for outreach actions
  outreachStatus?: OutreachStatus
  url?: string
  actionType: ActionType
  urgencyScore: number
  label: string
  why: string
}

// Returns the job patch to apply when the user marks an action done.
// The store always bumps updatedAt on any updateJob call, which naturally
// resets stale counters for staleness-driven actions (follow_up, revisit).
export function markDoneTransition(
  actionType: ActionType,
): Partial<Omit<Job, 'id' | 'createdAt'>> {
  switch (actionType) {
    case 'apply_today':
    case 'apply_soon':
      return { status: 'applied' }
    case 'tailor_resume':
    case 'research_company':
      return { status: 'ready_to_apply' }
    case 'complete_hirevue':
    case 'complete_oa':
      return { status: 'recruiter_screen' }
    case 'revisit':
      return { status: 'closed' }
    case 'follow_up_outreach':
      return {}  // copilot page calls updateOutreach directly for this type
    case 'prep_due':
      return {}  // copilot page calls updateInterview directly for this type
    case 'event_due':
      return {}  // copilot page calls updateEvent directly for this type
    case 'email_action':
      return {}  // copilot page calls updateEmail directly for this type
    default:
      return {}
  }
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
const PRE_APPLY: JobStatus[] = ['saved', 'researching', 'ready_to_apply']

interface ActionCtx {
  fit: number | null
  importance: 'high' | 'medium' | 'low' | null
  stale: number
  ddDays: number | null
}

function buildAction(job: Job, actionType: ActionType, ctx: ActionCtx): CopilotAction {
  const { fit, importance, stale, ddDays } = ctx
  const highFit = fit !== null && fit >= 75
  const highImportance = importance === 'high'

  let urgencyScore: number
  let label: string
  let why: string

  switch (actionType) {
    case 'complete_hirevue': {
      urgencyScore = 88
      if (ddDays !== null) {
        if (ddDays <= 0) urgencyScore = 100
        else if (ddDays <= 1) urgencyScore = 96
        else if (ddDays <= 3) urgencyScore = 92
      }
      const dl =
        ddDays !== null && ddDays <= 3
          ? ` — due ${ddDays <= 0 ? 'today' : ddDays === 1 ? 'tomorrow' : `in ${ddDays}d`}`
          : stale > 0 ? ` — ${stale}d no update` : ''
      label = `Complete HireVue for ${job.company}${dl}`
      why = `HireVue assessment pending${dl || ''}.`
      break
    }
    case 'complete_oa': {
      urgencyScore = 78
      if (ddDays !== null) {
        if (ddDays <= 0) urgencyScore = 98
        else if (ddDays <= 1) urgencyScore = 90
        else if (ddDays <= 3) urgencyScore = 85
      }
      const dl =
        ddDays !== null && ddDays <= 3
          ? ` — due ${ddDays <= 0 ? 'today' : ddDays === 1 ? 'tomorrow' : `in ${ddDays}d`}`
          : stale > 0 ? ` — ${stale}d no update` : ''
      label = `Complete OA for ${job.company}${dl}`
      why = `Online assessment pending${dl || ''}.`
      break
    }
    case 'apply_today': {
      urgencyScore = 97
      const when =
        ddDays !== null
          ? ddDays <= 0 ? 'today' : ddDays === 1 ? 'tomorrow' : `in ${ddDays}d`
          : 'today'
      label = `Apply to ${job.company} — deadline ${when}`
      why = `Deadline is ${when}.${highFit ? ` Fit: ${job.fitScore}.` : ''}${highImportance ? ` High importance.` : ''}`
      break
    }
    case 'apply_soon': {
      urgencyScore = 82
      label = `Apply to ${job.company} — deadline in ${ddDays}d`
      why = `Deadline in ${ddDays} days.${highFit ? ` Fit: ${job.fitScore}.` : ''}${highImportance ? ` High importance.` : ''}`
      break
    }
    case 'prep_interview': {
      const isFinal = job.status === 'final_round'
      urgencyScore = isFinal ? 75 : 68
      label = isFinal
        ? `Prep for final round at ${job.company}`
        : `Prep interview answers for ${job.company}`
      why = isFinal
        ? `Final round in progress — prioritize interview prep.${stale > 3 ? ` ${stale}d since update.` : ''}`
        : `Interview stage — use the AI assistant to practice.${stale > 3 ? ` ${stale}d since update.` : ''}`
      break
    }
    case 'follow_up': {
      const isRecruiter = job.status === 'recruiter_screen'
      const base = isRecruiter ? 55 : 42
      urgencyScore = Math.min(72, base + Math.floor(stale * 1.3))
      const who = isRecruiter ? 'recruiter' : 'hiring team'
      label = `Follow up with ${job.company} ${who} — ${stale}d no update`
      why = isRecruiter
        ? `${stale} days since recruiter contact. A timely follow-up shows continued interest.`
        : `${stale} days since last update. A short follow-up can keep you visible.`
      break
    }
    case 'tailor_resume': {
      urgencyScore = 52
      const parts: string[] = []
      if (highFit) parts.push(`Fit: ${job.fitScore}`)
      if (highImportance) parts.push(`Importance: ${job.importanceScore}`)
      label = `Tailor resume for ${job.company} — ${job.role}`
      why = (parts.length ? parts.join('. ') + '. ' : '') + 'Worth customizing before applying.'
      break
    }
    case 'research_company': {
      urgencyScore = 38
      label = `Research ${job.company} before applying`
      why = `Still in research phase. Add notes to your tracker before moving forward.`
      break
    }
    case 'revisit': {
      urgencyScore = Math.min(55, 28 + Math.floor(stale * 0.8))
      label = `Revisit ${job.company} — ${stale}d no update`
      why = `No activity in ${stale} days. Update the status or mark closed.`
      break
    }
    default: {
      urgencyScore = 50
      label = job.company
      why = ''
      break
    }
  }

  if (job.priority === 'high') urgencyScore = Math.min(100, urgencyScore + 8)
  if (highImportance) urgencyScore = Math.min(100, urgencyScore + 4)
  if (highFit) urgencyScore = Math.min(100, urgencyScore + 2)

  return {
    jobId: job.id,
    company: job.company,
    role: job.role,
    status: job.status,
    url: job.url,
    actionType,
    urgencyScore: Math.round(urgencyScore),
    label,
    why,
  }
}

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
    const preApply = PRE_APPLY.includes(job.status)
    const ctx: ActionCtx = { fit, importance, stale, ddDays }

    const jobActions: ActionType[] = []

    if (job.status === 'hirevue') {
      jobActions.push('complete_hirevue')
    } else if (job.status === 'oa') {
      jobActions.push('complete_oa')
    } else if (job.status === 'final_round' || job.status === 'interview') {
      jobActions.push('prep_interview')
      // Surface a follow-up alongside prep when the stage has gone quiet
      if (stale >= 7) jobActions.push('follow_up')
    } else if (preApply && ddDays !== null && ddDays <= 2) {
      jobActions.push('apply_today')
      // Suggest tailoring if high-value and not already polished
      if ((highFit || highImportance) && job.status !== 'ready_to_apply') {
        jobActions.push('tailor_resume')
      }
    } else if (preApply && ddDays !== null && ddDays <= 7) {
      jobActions.push('apply_soon')
      if ((highFit || highImportance) && job.status !== 'ready_to_apply') {
        jobActions.push('tailor_resume')
      }
    } else if (['applied', 'recruiter_screen'].includes(job.status) && stale >= 7) {
      jobActions.push('follow_up')
    } else if (job.status === 'researching') {
      // Research before tailoring — don't surface tailor_resume yet
      jobActions.push('research_company')
    } else if (job.status === 'saved' && (highFit || highImportance)) {
      jobActions.push('tailor_resume')
    } else if (stale >= 14) {
      jobActions.push('revisit')
    }

    for (const actionType of jobActions.slice(0, 2)) {
      actions.push(buildAction(job, actionType, ctx))
    }
  }

  return actions.sort((a, b) => b.urgencyScore - a.urgencyScore)
}

export function generateOutreachActions(outreach: Outreach[]): CopilotAction[] {
  const actions: CopilotAction[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const o of outreach) {
    if (o.status === 'closed' || o.status === 'replied') continue
    if (!o.followUpDate) continue

    const followUp = new Date(o.followUpDate + 'T00:00:00')
    const daysUntil = Math.round((followUp.getTime() - today.getTime()) / 86_400_000)

    if (daysUntil > 3) continue  // Only surface ≤ 3 days out or overdue

    let urgencyScore: number
    let label: string
    let why: string

    const abs = Math.abs(daysUntil)
    if (daysUntil < 0) {
      urgencyScore = Math.min(92, 80 + abs * 3)
      label = `Follow up with ${o.personName} at ${o.company} — overdue ${abs}d`
      why = `Follow-up was due ${abs} day${abs !== 1 ? 's' : ''} ago. Status: ${OUTREACH_STATUS_LABELS[o.status]}.`
    } else if (daysUntil === 0) {
      urgencyScore = 80
      label = `Follow up with ${o.personName} at ${o.company} — due today`
      why = `Follow-up is due today. Status: ${OUTREACH_STATUS_LABELS[o.status]}.`
    } else if (daysUntil === 1) {
      urgencyScore = 72
      label = `Follow up with ${o.personName} at ${o.company} — due tomorrow`
      why = `Follow-up due tomorrow.`
    } else {
      urgencyScore = 60
      label = `Follow up with ${o.personName} at ${o.company} — due in ${daysUntil}d`
      why = `Follow-up due in ${daysUntil} days.`
    }

    if (o.relationshipType === 'hiring_manager' || o.relationshipType === 'recruiter') {
      urgencyScore = Math.min(100, urgencyScore + 5)
    }

    actions.push({
      jobId: '',
      outreachId: o.id,
      company: o.company,
      role: o.role ?? '',
      outreachStatus: o.status,
      actionType: 'follow_up_outreach',
      urgencyScore: Math.round(urgencyScore),
      label,
      why,
    })
  }

  return actions.sort((a, b) => b.urgencyScore - a.urgencyScore)
}

export function generateInterviewPrepActions(interviews: InterviewPrep[]): CopilotAction[] {
  const actions: CopilotAction[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const iv of interviews) {
    if (iv.status === 'completed' || iv.status === 'done') continue
    if (!iv.interviewDate) continue

    const ivDate = new Date(iv.interviewDate + 'T00:00:00')
    const daysUntil = Math.round((ivDate.getTime() - today.getTime()) / 86_400_000)

    if (daysUntil > 3) continue

    const roundLabel = ROUND_TYPE_LABELS[iv.roundType]
    let urgencyScore: number
    let label: string
    let why: string

    if (daysUntil < 0) {
      urgencyScore = 85
      label = `Prep ${roundLabel} at ${iv.company} — interview was ${Math.abs(daysUntil)}d ago`
      why = `Interview was ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago — mark as completed or add feedback.`
    } else if (daysUntil === 0) {
      urgencyScore = 95
      label = `${roundLabel} at ${iv.company} — today!`
      why = `Interview is today. Final prep and review your notes.`
    } else if (daysUntil === 1) {
      urgencyScore = 88
      label = `Prep ${roundLabel} at ${iv.company} — tomorrow`
      why = `Interview is tomorrow. Review your stories and practice key questions.`
    } else {
      urgencyScore = 72
      label = `Prep ${roundLabel} at ${iv.company} — in ${daysUntil}d`
      why = `Interview in ${daysUntil} days. Start preparing now.`
    }

    if (iv.status === 'needs_prep') urgencyScore = Math.min(100, urgencyScore + 5)
    if (iv.roundType === 'final') urgencyScore = Math.min(100, urgencyScore + 5)

    actions.push({
      jobId: iv.relatedJobId ?? '',
      interviewId: iv.id,
      company: iv.company,
      role: iv.role ?? '',
      actionType: 'prep_due',
      urgencyScore: Math.round(urgencyScore),
      label,
      why,
    })
  }

  return actions.sort((a, b) => b.urgencyScore - a.urgencyScore)
}

export function generateEmailActions(emails: EmailMessage[]): CopilotAction[] {
  const actions: CopilotAction[] = []

  const URGENCY: Partial<Record<string, number>> = {
    offer: 95,
    interview_invite: 88,
    oa_link: 85,
    rejection: 60,
    recruiter_reply: 65,
    follow_up: 58,
    networking: 45,
    other: 40,
  }

  for (const email of emails) {
    if (email.status !== 'unread') continue

    const base = URGENCY[email.emailType] ?? 40
    const ageDays = Math.floor(
      (Date.now() - new Date(email.createdAt).getTime()) / 86_400_000,
    )
    // Urgency decays slightly after 3 days (action already late)
    const score = Math.min(100, ageDays >= 3 ? base + 5 : base)

    const company = email.company ?? 'Unknown'
    const typeLabel = EMAIL_TYPE_LABELS[email.emailType]
    const label = email.subject
      ? `${company}: ${email.subject.slice(0, 60)}`
      : `${company} — ${typeLabel}`
    const why = email.detectedAction
      ? `${typeLabel} detected. Action: ${email.detectedAction}.`
      : `${typeLabel} needs review.`

    actions.push({
      jobId: email.relatedJobId ?? '',
      emailId: email.id,
      company,
      role: '',
      actionType: 'email_action',
      urgencyScore: Math.round(score),
      label,
      why,
    })
  }

  return actions.sort((a, b) => b.urgencyScore - a.urgencyScore)
}

export function generateCalendarActions(events: CalendarEvent[]): CopilotAction[] {
  const actions: CopilotAction[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const e of events) {
    if (e.status !== 'upcoming') continue

    const dateStr = e.startDateTime.includes('T') ? e.startDateTime.split('T')[0] : e.startDateTime
    const eventDate = new Date(dateStr + 'T00:00:00')
    const daysUntilEvent = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000)

    if (daysUntilEvent > 3) continue

    const typeLabel = EVENT_TYPE_LABELS[e.eventType]
    let score: number
    let label: string
    let why: string

    if (daysUntilEvent < 0) {
      score = Math.min(92, 78 + Math.abs(daysUntilEvent) * 3)
      label = `${e.title} — overdue ${Math.abs(daysUntilEvent)}d`
      why = `${typeLabel} was due ${Math.abs(daysUntilEvent)} day${Math.abs(daysUntilEvent) !== 1 ? 's' : ''} ago.`
    } else if (daysUntilEvent === 0) {
      score = 90
      label = `${e.title} — today`
      why = `${typeLabel} is today.`
    } else if (daysUntilEvent === 1) {
      score = 78
      label = `${e.title} — tomorrow`
      why = `${typeLabel} is tomorrow.`
    } else {
      score = 62
      label = `${e.title} — in ${daysUntilEvent}d`
      why = `${typeLabel} in ${daysUntilEvent} days.`
    }

    actions.push({
      jobId: e.relatedJobId ?? '',
      outreachId: e.relatedOutreachId,
      interviewId: e.relatedInterviewId,
      eventId: e.id,
      company: e.company ?? '',
      role: '',
      actionType: 'event_due',
      urgencyScore: Math.round(score),
      label,
      why,
    })
  }

  return actions.sort((a, b) => b.urgencyScore - a.urgencyScore)
}
