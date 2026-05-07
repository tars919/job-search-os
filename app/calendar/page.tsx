'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_ICONS,
  type CalendarEvent,
  type EventType,
  type EventStatus,
} from '@/lib/types'
import {
  deriveEvents,
  mergeEvents,
  groupEvents,
  daysUntil,
  countdownLabel,
  countdownColor,
  urgencyScore as calcUrgency,
} from '@/lib/calendar'

// ─── Snooze ───────────────────────────────────────────────────────────────────

const SNOOZE_KEY = 'jsos:calendar-snoozed'

function loadSnoozed(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}') } catch { return {} }
}
function saveSnoozed(s: Record<string, string>) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(s))
}
function isSnoozed(map: Record<string, string>, id: string): boolean {
  const until = map[id]
  return !!until && new Date(until) > new Date()
}

// ─── Urgency ring ─────────────────────────────────────────────────────────────

function urgencyRing(score: number) {
  if (score >= 88) return { ring: 'border-red-400', text: 'text-red-600', bg: 'bg-red-50' }
  if (score >= 70) return { ring: 'border-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' }
  if (score >= 50) return { ring: 'border-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' }
  return { ring: 'border-zinc-300', text: 'text-zinc-500', bg: 'bg-zinc-50' }
}

// ─── Add Event modal (inline) ─────────────────────────────────────────────────

interface AddEventForm {
  title: string
  eventType: EventType
  company: string
  startDateTime: string
  endDateTime: string
  location: string
  meetingLink: string
  notes: string
  status: EventStatus
}

const EMPTY_FORM: AddEventForm = {
  title: '',
  eventType: 'other',
  company: '',
  startDateTime: '',
  endDateTime: '',
  location: '',
  meetingLink: '',
  notes: '',
  status: 'upcoming',
}

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  companies: string[]
}

function AddEventModal({ isOpen, onClose, onSave, companies }: AddEventModalProps) {
  const [form, setForm] = useState<AddEventForm>(EMPTY_FORM)

  function set<K extends keyof AddEventForm>(key: K, val: AddEventForm[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.startDateTime) return
    onSave({
      title: form.title.trim(),
      eventType: form.eventType,
      company: form.company.trim() || undefined,
      startDateTime: form.startDateTime,
      endDateTime: form.endDateTime || undefined,
      location: form.location.trim() || undefined,
      meetingLink: form.meetingLink.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
    })
    setForm(EMPTY_FORM)
    onClose()
  }

  if (!isOpen) return null

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'
  const label = 'block text-xs font-medium text-zinc-500 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Add Event</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={label}>Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Stripe final round interview" className={field} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Event Type</label>
              <select value={form.eventType} onChange={(e) => set('eventType', e.target.value as EventType)} className={`${field} bg-white`}>
                {(['interview','application_deadline','follow_up','networking','prep_session','oa_due','other'] as EventType[]).map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Company</label>
              <input value={form.company} onChange={(e) => set('company', e.target.value)} list="cal-company-list" placeholder="Stripe" className={field} />
              <datalist id="cal-company-list">{companies.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Date *</label>
              <input type="date" value={form.startDateTime} onChange={(e) => set('startDateTime', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>End Date</label>
              <input type="date" value={form.endDateTime} onChange={(e) => set('endDateTime', e.target.value)} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Location</label>
              <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Zoom / On-site" className={field} />
            </div>
            <div>
              <label className={label}>Meeting Link</label>
              <input value={form.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://..." className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={`${field} resize-none`} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.title.trim() || !form.startDateTime} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">Add Event</button>
        </div>
      </div>
    </div>
  )
}

// ─── Event card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: CalendarEvent
  onComplete: (event: CalendarEvent) => void
  onSnooze: (id: string) => void
  onDelete: (id: string) => void
}

function EventCard({ event, onComplete, onSnooze, onDelete }: EventCardProps) {
  const router = useRouter()
  const d = daysUntil(event.startDateTime)
  const score = calcUrgency(d)
  const ring = urgencyRing(score)
  const isStored = !event.id.startsWith('derived:')

  function handleGenPrep() {
    const params = new URLSearchParams()
    if (event.eventType === 'interview') {
      params.set('task', 'gen_interview_questions')
      if (event.relatedInterviewId) params.set('interviewId', event.relatedInterviewId)
    } else if (event.eventType === 'follow_up') {
      params.set('task', 'draft_recruiter_message')
    } else {
      params.set('task', 'prep_interview')
    }
    if (event.relatedJobId) params.set('jobId', event.relatedJobId)
    router.push(`/assistant?${params.toString()}`)
  }

  function handleOpenJob() {
    if (event.relatedInterviewId) {
      router.push('/interviews')
    } else if (event.relatedOutreachId) {
      router.push('/outreach')
    } else if (event.relatedJobId) {
      router.push('/applications')
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors group">
      {/* Urgency ring */}
      <div className={`shrink-0 w-14 h-14 rounded-full border-2 ${ring.ring} ${ring.bg} flex flex-col items-center justify-center`}>
        <span className="text-lg leading-none">{EVENT_TYPE_ICONS[event.eventType]}</span>
        <span className={`text-[9px] mt-0.5 font-semibold ${ring.text}`}>{score}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 leading-snug">{event.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {event.company && <span className="text-xs font-medium text-zinc-600">{event.company}</span>}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${EVENT_TYPE_COLORS[event.eventType]}`}>
            {EVENT_TYPE_LABELS[event.eventType]}
          </span>
          <span className={`text-xs ${countdownColor(d)}`}>{countdownLabel(d)}</span>
        </div>
        {event.location && (
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {event.location}
          </p>
        )}
        {event.notes && <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{event.notes}</p>}
      </div>

      {/* Quick actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {(event.relatedJobId || event.relatedInterviewId || event.relatedOutreachId) && (
          <button onClick={handleOpenJob} title="Open related" className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
        )}
        {event.meetingLink && (
          <button onClick={() => window.open(event.meetingLink, '_blank', 'noopener,noreferrer')} title="Open meeting link" className="p-2 rounded-lg text-zinc-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.888L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
            </svg>
          </button>
        )}
        <button onClick={handleGenPrep} title="Generate prep with AI" className="p-2 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.51 20 12 16.44 6.49 20l1.88-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69L12 3z"/>
          </svg>
        </button>
        <button onClick={() => onSnooze(event.id)} title="Snooze 24h" className="p-2 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
        <button onClick={() => onComplete(event)} title="Mark complete" className="p-2 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        {isStored && (
          <button onClick={() => onDelete(event.id)} title="Delete" className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, subtitle, events, onComplete, onSnooze, onDelete }: {
  title: string
  subtitle: string
  events: CalendarEvent[]
  onComplete: (e: CalendarEvent) => void
  onSnooze: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (events.length === 0) return (
    <div className="text-center py-12 border border-dashed border-zinc-200 rounded-xl">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
    </div>
  )
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} onComplete={onComplete} onSnooze={onSnooze} onDelete={onDelete} />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'today' | 'this_week' | 'upcoming'

export default function CalendarPage() {
  const { jobs, outreach, interviews, events: storedEvents, ready, addEvent, updateEvent, deleteEvent, updateJob, updateOutreach, updateInterview } = useStore()
  const [view, setView] = useState<View>('today')
  const [modalOpen, setModalOpen] = useState(false)
  const [snoozed, setSnoozed] = useState<Record<string, string>>(() => loadSnoozed())

  const allEvents = useMemo(() => {
    if (!ready) return []
    const derived = deriveEvents(jobs, outreach, interviews)
    const merged = mergeEvents(storedEvents, derived)
    return merged.filter((e) => !isSnoozed(snoozed, e.id))
  }, [jobs, outreach, interviews, storedEvents, ready, snoozed])

  const grouped = useMemo(() => groupEvents(allEvents), [allEvents])

  const visibleEvents = view === 'today' ? grouped.today : view === 'this_week' ? grouped.thisWeek : grouped.upcoming

  const allCompanies = useMemo(
    () => [...new Set([...jobs.map((j) => j.company), ...outreach.map((o) => o.company), ...interviews.map((iv) => iv.company)])].sort(),
    [jobs, outreach, interviews],
  )

  function handleSnooze(id: string) {
    const until = new Date(Date.now() + 86_400_000).toISOString()
    const next = { ...snoozed, [id]: until }
    setSnoozed(next)
    saveSnoozed(next)
  }

  function handleComplete(event: CalendarEvent) {
    if (event.id.startsWith('derived:job:')) {
      updateJob(event.relatedJobId!, { status: 'applied' })
    } else if (event.id.startsWith('derived:outreach:')) {
      updateOutreach(event.relatedOutreachId!, { status: 'sent', followUpDate: undefined })
    } else if (event.id.startsWith('derived:interview:')) {
      updateInterview(event.relatedInterviewId!, { status: 'completed' })
    } else {
      updateEvent(event.id, { status: 'completed' })
    }
  }

  const tabs: { id: View; label: string; count: number }[] = [
    { id: 'today', label: 'Today', count: grouped.today.length },
    { id: 'this_week', label: 'This Week', count: grouped.thisWeek.length },
    { id: 'upcoming', label: 'Upcoming', count: grouped.upcoming.length },
  ]

  if (!ready) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-28 bg-zinc-100 rounded animate-pulse" />
        {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  const totalUrgent = grouped.today.length
  const badgeColor = totalUrgent > 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {allEvents.length === 0
              ? 'No upcoming events. Add a job deadline or interview to get started.'
              : `${allEvents.length} event${allEvents.length !== 1 ? 's' : ''} across your pipeline.`}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {totalUrgent > 0 && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeColor}`}>
              {totalUrgent} today
            </span>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Event
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 mb-6 border-b border-zinc-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-3 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              view === t.id
                ? 'text-blue-600 border-blue-600'
                : 'text-zinc-500 hover:text-zinc-900 border-transparent'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                view === t.id ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state — no events at all */}
      {allEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <p className="text-base font-medium text-zinc-600">No events yet</p>
          <p className="text-sm text-zinc-400 mt-1 max-w-xs">
            Events are auto-generated from job deadlines, interview dates, and outreach follow-ups. Add one to get started.
          </p>
        </div>
      ) : (
        <Section
          title={
            view === 'today' ? 'Nothing due today' :
            view === 'this_week' ? 'Nothing due this week' :
            'Nothing upcoming'
          }
          subtitle={
            view === 'today' ? "You're clear for today." :
            view === 'this_week' ? 'Check back as your pipeline grows.' :
            'No events beyond this week.'
          }
          events={visibleEvents}
          onComplete={handleComplete}
          onSnooze={handleSnooze}
          onDelete={deleteEvent}
        />
      )}

      <AddEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addEvent}
        companies={allCompanies}
      />
    </div>
  )
}
