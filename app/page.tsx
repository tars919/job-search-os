'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { ACTIVE_STATUSES, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { MetricCard, MetricCardSkeleton } from '@/components/MetricCard'
import { daysUntil, dueLabel, dueColor } from '@/lib/utils'
import {
  generateActions,
  generateOutreachActions,
  generateInterviewPrepActions,
  generateEmailActions,
  generateCalendarActions,
} from '@/lib/copilot'

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
      </div>
    )
  }

  const sent = jobs.filter((j) => !!j.appliedAt).length
  const responded = jobs.filter(
    (j) =>
      !!j.appliedAt &&
      j.status !== 'applied' &&
      j.status !== 'saved' &&
      j.status !== 'researching' &&
      j.status !== 'ready_to_apply',
  ).length
  const responseRate = sent > 0 ? Math.round((responded / sent) * 100) : 0

  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length
  const finalStages = jobs.filter(
    (j) => j.status === 'interview' || j.status === 'final_round',
  ).length

  const interviewCount = finalStages
  const offers = jobs.filter((j) => j.status === 'offer').length

  const upcomingDeadlines = jobs
    .filter((j) => !!j.deadline && j.status !== 'rejected' && j.status !== 'closed')
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">{today}</p>
      </div>

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
          label="Interviews"
          value={interviewCount}
          sub="interview & final round"
        />
        <MetricCard
          label="Offers"
          value={offers}
          sub={offers > 0 ? `${offers} received` : 'Keep pushing'}
          accent={offers > 0 ? 'text-emerald-600' : undefined}
        />
      </div>

      {/* Upcoming deadlines */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Upcoming Deadlines</h2>
            {upcomingDeadlines.length > 0 && (
              <span className="text-xs text-zinc-400">
                {upcomingDeadlines.length} item{upcomingDeadlines.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Link
            href="/calendar"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            View Calendar →
          </Link>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            No upcoming deadlines. Add a deadline when editing a job.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide w-36">
                    Company
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide w-36">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide w-28">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide w-28">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {upcomingDeadlines.map((job) => {
                  const days = daysUntil(job.deadline!)
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-zinc-900 whitespace-nowrap">
                        {job.company}
                      </td>
                      <td className="px-5 py-3 text-zinc-500">{job.role}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}
                        >
                          {STATUS_LABELS[job.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-400 tabular-nums whitespace-nowrap">
                        {new Date(job.deadline! + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className={`px-5 py-3 tabular-nums whitespace-nowrap ${dueColor(days)}`}>
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
    </div>
  )
}
