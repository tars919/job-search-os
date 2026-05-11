'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import {
  ACTIVE_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  EVENT_TYPE_ICONS,
  EMAIL_TYPE_ICONS,
  EMAIL_TYPE_COLORS,
  EMAIL_TYPE_LABELS,
  type CalendarEvent,
  type EmailMessage,
} from '@/lib/types'
import { MetricCard, MetricCardSkeleton } from '@/components/MetricCard'
import { daysUntil, dueLabel, dueColor } from '@/lib/utils'
import {
  generateActions,
  generateOutreachActions,
  generateInterviewPrepActions,
  generateEmailActions,
  generateCalendarActions,
} from '@/lib/copilot'

// Computed at module load — avoids calling Date.now() during render
const MODULE_NOW = Date.now()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date(MODULE_NOW).toISOString().slice(0, 10)
}

function formatEventTime(iso: string): string {
  if (!iso.includes('T')) return iso
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function relativeTime(iso: string): string {
  const diff = MODULE_NOW - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Today's Focus card ───────────────────────────────────────────────────────

function TodayFocus({ events }: { events: CalendarEvent[] }) {
  const today = todayStr()
  const todayEvents = events.filter((e) => {
    const d = e.startDateTime.slice(0, 10)
    return d === today && e.status === 'upcoming'
  })

  if (todayEvents.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-5 py-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📍</span>
        <h2 className="text-sm font-semibold text-blue-900">Today&apos;s Focus</h2>
      </div>
      <div className="space-y-2">
        {todayEvents.map((e) => (
          <div key={e.id} className="flex items-center gap-3">
            <span className="text-base shrink-0">{EVENT_TYPE_ICONS[e.eventType]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 truncate">{e.title}</p>
              {e.company && <p className="text-xs text-blue-600">{e.company}</p>}
            </div>
            {e.startDateTime.includes('T') && (
              <span className="text-xs font-medium text-blue-700 shrink-0 tabular-nums">
                {formatEventTime(e.startDateTime)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Activity feed item ───────────────────────────────────────────────────────

function EmailActivityItem({ email }: { email: EmailMessage }) {
  return (
    <Link href="/email" className="flex items-start gap-3 py-3 hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition-colors group">
      <span className="text-base shrink-0 mt-0.5">{EMAIL_TYPE_ICONS[email.emailType]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-zinc-800 truncate">
            {email.subject ?? 'No subject'}
          </p>
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${EMAIL_TYPE_COLORS[email.emailType]}`}>
            {EMAIL_TYPE_LABELS[email.emailType]}
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          {email.company ?? email.senderEmail ?? 'Unknown sender'}
          {email.createdAt && <span className="ml-2">{relativeTime(email.createdAt)}</span>}
        </p>
      </div>
    </Link>
  )
}

// ─── Stale pipeline section ───────────────────────────────────────────────────

function StalePipeline({ jobs }: { jobs: ReturnType<typeof useStore>['jobs'] }) {
  const STALE_DAYS = 14
  const stale = jobs
    .filter((j) => {
      if (!ACTIVE_STATUSES.includes(j.status)) return false
      const updated = new Date(j.updatedAt).getTime()
      return (MODULE_NOW - updated) / 86_400_000 > STALE_DAYS
    })
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(0, 4)

  if (stale.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <h2 className="text-sm font-semibold text-amber-900">Stale Pipeline</h2>
          <span className="text-xs text-amber-600">No update in {STALE_DAYS}+ days</span>
        </div>
        <Link href="/copilot" className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors">
          View actions →
        </Link>
      </div>
      <div className="divide-y divide-amber-50">
        {stale.map((job) => {
          const daysSince = Math.floor((MODULE_NOW - new Date(job.updatedAt).getTime()) / 86_400_000)
          return (
            <div key={job.id} className="flex items-center px-5 py-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800">{job.company}</p>
                <p className="text-xs text-zinc-400 truncate">{job.role}</p>
              </div>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                {STATUS_LABELS[job.status]}
              </span>
              <span className="shrink-0 text-xs text-amber-600 tabular-nums">{daysSince}d</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { jobs, outreach, interviews, events, emails, ready } = useStore()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const pendingActions = useMemo(() => {
    if (!ready) return 0
    return (
      generateActions(jobs).length +
      generateOutreachActions(outreach).length +
      generateInterviewPrepActions(interviews).length +
      generateEmailActions(emails).length +
      generateCalendarActions(events).length
    )
  }, [jobs, outreach, interviews, events, emails, ready])

  if (!ready) {
    return (
      <div className="p-6 sm:p-8 max-w-5xl">
        <div className="mb-8 space-y-1">
          <div className="h-7 w-40 bg-zinc-100 rounded animate-pulse" />
          <div className="h-4 w-56 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-48 bg-zinc-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-zinc-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  const sent = jobs.filter((j) => !!j.appliedAt).length
  const responded = jobs.filter(
    (j) => !!j.appliedAt && j.status !== 'applied' && j.status !== 'saved' && j.status !== 'researching' && j.status !== 'ready_to_apply',
  ).length
  const responseRate = sent > 0 ? Math.round((responded / sent) * 100) : 0

  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length
  const finalStages = jobs.filter((j) => j.status === 'interview' || j.status === 'final_round').length
  const offers = jobs.filter((j) => j.status === 'offer').length

  const upcomingDeadlines = jobs
    .filter((j) => !!j.deadline && j.status !== 'rejected' && j.status !== 'closed')
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
    .slice(0, 6)

  const recentEmails = [...emails]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const unreadCount = emails.filter((e) => e.status === 'unread').length

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">{today}</p>
      </div>

      {/* Today's focus */}
      <TodayFocus events={events} />

      {/* Copilot banner */}
      {pendingActions > 0 && (
        <Link
          href="/copilot"
          className="flex items-center justify-between mb-6 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">⚡</span>
            <p className="text-sm font-medium text-blue-900">
              {pendingActions} pending action{pendingActions !== 1 ? 's' : ''} in your Copilot queue
            </p>
          </div>
          <span className="text-sm font-semibold text-blue-700 group-hover:text-blue-900 transition-colors">
            Review →
          </span>
        </Link>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Applications Sent"
          value={sent}
          sub={sent > 0 ? `${responseRate}% response rate` : 'No applications yet'}
        />
        <MetricCard
          label="Active Pipeline"
          value={active}
          sub={`${finalStages} in final stage${finalStages !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Unread Emails"
          value={unreadCount}
          sub={emails.length > 0 ? `${emails.length} total tracked` : 'Connect Gmail to sync'}
          accent={unreadCount > 0 ? 'text-blue-600' : undefined}
        />
        <MetricCard
          label="Offers"
          value={offers}
          sub={offers > 0 ? `${offers} received` : 'Keep pushing'}
          accent={offers > 0 ? 'text-emerald-600' : undefined}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Upcoming deadlines */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Upcoming Deadlines</h2>
              {upcomingDeadlines.length > 0 && (
                <span className="text-xs text-zinc-400">{upcomingDeadlines.length} item{upcomingDeadlines.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <Link href="/calendar" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
              View Calendar →
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-zinc-400">No upcoming deadlines</p>
              <p className="text-xs text-zinc-300 mt-1">Add a deadline when editing a job application</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide w-36">Company</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide w-36">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide w-28">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingDeadlines.map((job) => {
                    const days = daysUntil(job.deadline!)
                    return (
                      <tr key={job.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-zinc-900 whitespace-nowrap">{job.company}</td>
                        <td className="px-5 py-3 text-zinc-500 max-w-[160px]"><span className="truncate block">{job.role}</span></td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                            {STATUS_LABELS[job.status]}
                          </span>
                        </td>
                        <td className={`px-5 py-3 tabular-nums whitespace-nowrap font-medium ${dueColor(days)}`}>
                          {dueLabel(days)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent email activity */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Recent Emails</h2>
              {unreadCount > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
              )}
            </div>
            <Link href="/email" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
              View all →
            </Link>
          </div>

          {recentEmails.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-zinc-400">No emails yet</p>
              <Link href="/email" className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                Connect Gmail →
              </Link>
            </div>
          ) : (
            <div className="px-3 py-2 divide-y divide-zinc-50">
              {recentEmails.map((email) => (
                <EmailActivityItem key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stale pipeline */}
      <StalePipeline jobs={jobs} />

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/applications', label: 'Applications', icon: '💼', sub: `${jobs.length} tracked` },
          { href: '/email', label: 'Email', icon: '📧', sub: unreadCount > 0 ? `${unreadCount} unread` : 'All caught up' },
          { href: '/interviews', label: 'Interviews', icon: '🎤', sub: `${interviews.length} tracked` },
          { href: '/outreach', label: 'Outreach', icon: '🤝', sub: `${outreach.length} contacts` },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all group"
          >
            <span className="text-xl shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-900">{item.label}</p>
              <p className="text-xs text-zinc-400 truncate">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
