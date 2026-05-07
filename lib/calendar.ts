import type { Job, Outreach, InterviewPrep, CalendarEvent } from './types'

// ─── Time helpers ─────────────────────────────────────────────────────────────

export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Handle both YYYY-MM-DD and ISO datetime strings
  const target = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00')
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function countdownLabel(d: number): string {
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return `In ${d}d`
}

export function countdownColor(d: number): string {
  if (d < 0) return 'text-red-600 font-semibold'
  if (d === 0) return 'text-red-600 font-semibold'
  if (d === 1) return 'text-amber-600 font-semibold'
  if (d <= 3) return 'text-amber-600'
  return 'text-zinc-500'
}

export function urgencyScore(d: number): number {
  if (d < 0) return Math.min(100, 85 + Math.abs(d) * 3)
  if (d === 0) return 95
  if (d === 1) return 88
  if (d <= 3) return 75
  if (d <= 7) return 55
  return 30
}

function isoDate(dateStr: string): string {
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

// ─── Derive events from existing data ────────────────────────────────────────

export function deriveEvents(
  jobs: Job[],
  outreach: Outreach[],
  interviews: InterviewPrep[],
): CalendarEvent[] {
  const derived: CalendarEvent[] = []
  const now = new Date().toISOString()

  for (const job of jobs) {
    if (!job.deadline) continue
    if (job.status === 'rejected' || job.status === 'closed' || job.status === 'offer') continue
    derived.push({
      id: `derived:job:${job.id}:deadline`,
      title: `${job.company} — application closes`,
      eventType: 'application_deadline',
      relatedJobId: job.id,
      company: job.company,
      startDateTime: job.deadline,
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    })
  }

  for (const o of outreach) {
    if (!o.followUpDate) continue
    if (o.status === 'closed' || o.status === 'replied') continue
    derived.push({
      id: `derived:outreach:${o.id}:followup`,
      title: `Follow up with ${o.personName} at ${o.company}`,
      eventType: 'follow_up',
      relatedOutreachId: o.id,
      relatedJobId: o.relatedJobId,
      company: o.company,
      startDateTime: o.followUpDate,
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    })
  }

  for (const iv of interviews) {
    if (!iv.interviewDate) continue
    if (iv.status === 'completed' || iv.status === 'done') continue
    derived.push({
      id: `derived:interview:${iv.id}:date`,
      title: `${iv.roundName} — ${iv.company}`,
      eventType: 'interview',
      relatedInterviewId: iv.id,
      relatedJobId: iv.relatedJobId,
      company: iv.company,
      startDateTime: iv.interviewDate,
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    })
  }

  return derived
}

// ─── Merge stored + derived ───────────────────────────────────────────────────

export function mergeEvents(
  stored: CalendarEvent[],
  derived: CalendarEvent[],
): CalendarEvent[] {
  // Stored events take priority; derived events fill in anything not manually overridden.
  // A stored event "shadows" a derived event if they share the same relatedJobId/outreachId/interviewId.
  const storedJobDeadlines = new Set(stored.filter((e) => e.eventType === 'application_deadline').map((e) => e.relatedJobId).filter(Boolean))
  const storedFollowUps = new Set(stored.filter((e) => e.eventType === 'follow_up').map((e) => e.relatedOutreachId).filter(Boolean))
  const storedInterviews = new Set(stored.filter((e) => e.eventType === 'interview').map((e) => e.relatedInterviewId).filter(Boolean))

  const filteredDerived = derived.filter((e) => {
    if (e.eventType === 'application_deadline' && storedJobDeadlines.has(e.relatedJobId)) return false
    if (e.eventType === 'follow_up' && storedFollowUps.has(e.relatedOutreachId)) return false
    if (e.eventType === 'interview' && storedInterviews.has(e.relatedInterviewId)) return false
    return true
  })

  return [...stored, ...filteredDerived].sort((a, b) =>
    isoDate(a.startDateTime).localeCompare(isoDate(b.startDateTime)),
  )
}

// ─── Group by view ────────────────────────────────────────────────────────────

export interface GroupedEvents {
  today: CalendarEvent[]
  thisWeek: CalendarEvent[]
  upcoming: CalendarEvent[]
}

export function groupEvents(events: CalendarEvent[]): GroupedEvents {
  const visible = events.filter((e) => e.status === 'upcoming' || e.status === 'missed')

  const today: CalendarEvent[] = []
  const thisWeek: CalendarEvent[] = []
  const upcoming: CalendarEvent[] = []

  for (const e of visible) {
    const d = daysUntil(e.startDateTime)
    if (d <= 0 && d >= -1) {
      today.push(e)
    } else if (d > 0 && d <= 7) {
      thisWeek.push(e)
    } else if (d > 7) {
      upcoming.push(e)
    } else {
      // overdue beyond 1 day — still show in today bucket as overdue
      today.push(e)
    }
  }

  return { today, thisWeek, upcoming }
}
