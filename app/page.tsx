'use client'

import { useStore } from '@/lib/store'
import { ACTIVE_STATUSES, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function dueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function dueColor(days: number): string {
  if (days < 0) return 'text-red-600 font-semibold'
  if (days <= 1) return 'text-red-500 font-semibold'
  if (days <= 3) return 'text-amber-600 font-medium'
  if (days <= 7) return 'text-yellow-600'
  return 'text-zinc-400'
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string
  value: number | string
  sub: string
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-4xl font-semibold text-zinc-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{sub}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4 space-y-3 animate-pulse">
      <div className="h-3 w-24 bg-zinc-100 rounded" />
      <div className="h-8 w-12 bg-zinc-100 rounded" />
      <div className="h-3 w-32 bg-zinc-100 rounded" />
    </div>
  )
}

export default function DashboardPage() {
  const { jobs, ready } = useStore()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (!ready) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="mb-8 space-y-1">
          <div className="h-7 w-40 bg-zinc-100 rounded animate-pulse" />
          <div className="h-4 w-56 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
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

  const interviews = finalStages
  const offers = jobs.filter((j) => j.status === 'offer').length

  const upcomingDeadlines = jobs
    .filter((j) => !!j.deadline && j.status !== 'rejected' && j.status !== 'closed')
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">{today}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
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
          value={interviews}
          sub="interview & final round"
        />
        <MetricCard
          label="Offers"
          value={offers}
          sub={offers > 0 ? `${offers} received` : 'Keep pushing'}
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Upcoming Deadlines</h2>
          {upcomingDeadlines.length > 0 && (
            <span className="text-xs text-zinc-400">{upcomingDeadlines.length} item{upcomingDeadlines.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {upcomingDeadlines.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            No upcoming deadlines. Add a deadline when editing a job.
          </p>
        ) : (
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
        )}
      </div>
    </div>
  )
}
