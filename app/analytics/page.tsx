'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  AreaChart, Area, CartesianGrid,
  PieChart, Pie,
} from 'recharts'
import { useStore } from '@/lib/store'
import {
  JOB_STATUSES,
  STATUS_LABELS,
  ACTIVE_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  type Job,
  type JobStatus,
  type Priority,
} from '@/lib/types'

// ─── Chart colour palette ─────────────────────────────────────────────────────

const STATUS_CHART_COLORS: Record<JobStatus, string> = {
  saved: '#71717a',
  researching: '#0ea5e9',
  ready_to_apply: '#6366f1',
  applied: '#f59e0b',
  oa: '#f97316',
  hirevue: '#fb923c',
  recruiter_screen: '#8b5cf6',
  interview: '#a855f7',
  final_round: '#ec4899',
  offer: '#22c55e',
  rejected: '#ef4444',
  closed: '#a1a1aa',
}

const PRIORITY_CHART_COLORS: Record<Priority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#a1a1aa',
}

const BLUE = '#3b82f6'

// ─── Small shared components ──────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub: string
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-2 text-4xl font-semibold tabular-nums ${accent ?? 'text-zinc-900'}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{sub}</p>
    </div>
  )
}

function ChartCard({
  title,
  sub,
  children,
  className = '',
}: {
  title: string
  sub?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl border border-zinc-200 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-zinc-400">{message}</div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-md px-3 py-2 text-xs">
      {label && <p className="font-medium text-zinc-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-zinc-600">
          <span className="font-semibold text-zinc-900">{p.value}</span>
          {p.name !== 'count' && ` ${p.name}`}
        </p>
      ))}
    </div>
  )
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function topN(
  jobs: Job[],
  key: keyof Job,
  n = 10,
): Array<{ name: string; count: number }> {
  const counts: Record<string, number> = {}
  jobs.forEach((j) => {
    const val = (j[key] as string | undefined)?.trim()
    if (val) counts[val] = (counts[val] ?? 0) + 1
  })
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name, count]) => ({ name, count }))
}

function timeAgo(iso: string): string {
  const d = daysSince(iso)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4 space-y-3 animate-pulse">
      <div className="h-3 w-24 bg-zinc-100 rounded" />
      <div className="h-8 w-12 bg-zinc-100 rounded" />
      <div className="h-3 w-32 bg-zinc-100 rounded" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { jobs, ready } = useStore()

  // ── Metrics ──────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = jobs.length
    const sent = jobs.filter((j) => !!j.appliedAt).length
    const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length
    const offers = jobs.filter((j) => j.status === 'offer').length
    const rejected = jobs.filter((j) => j.status === 'rejected').length
    const responded = jobs.filter(
      (j) =>
        !!j.appliedAt &&
        !['applied', 'saved', 'researching', 'ready_to_apply', 'closed'].includes(j.status),
    ).length
    const interviewed = jobs.filter(
      (j) => j.status === 'interview' || j.status === 'final_round',
    ).length

    return {
      total,
      sent,
      active,
      offers,
      rejected,
      responded,
      interviewed,
      responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
      interviewRate: sent > 0 ? Math.round((interviewed / sent) * 100) : 0,
      rejectionRate: sent > 0 ? Math.round((rejected / sent) * 100) : 0,
    }
  }, [jobs])

  // ── Status distribution ───────────────────────────────────────────────────
  const statusData = useMemo(
    () =>
      JOB_STATUSES.map((s) => ({
        status: STATUS_LABELS[s],
        count: jobs.filter((j) => j.status === s).length,
        s,
      })).filter((d) => d.count > 0),
    [jobs],
  )

  // ── Applications over time ────────────────────────────────────────────────
  const appsOverTime = useMemo(() => {
    const groups: Record<string, number> = {}
    jobs
      .filter((j) => !!j.appliedAt)
      .forEach((j) => {
        const month = j.appliedAt!.slice(0, 7)
        groups[month] = (groups[month] ?? 0) + 1
      })
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: new Date(month + '-15').toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        count,
      }))
  }, [jobs])

  // ── Priority split ────────────────────────────────────────────────────────
  const priorityData = useMemo(
    () =>
      PRIORITIES.map((p) => ({
        name: PRIORITY_LABELS[p],
        value: jobs.filter((j) => (j.priority ?? 'medium') === p).length,
        p,
      })).filter((d) => d.value > 0),
    [jobs],
  )

  // ── Top companies & locations ─────────────────────────────────────────────
  const topCompanies = useMemo(() => topN(jobs, 'company'), [jobs])
  const topLocations = useMemo(() => topN(jobs, 'location'), [jobs])

  // ── Insights ──────────────────────────────────────────────────────────────
  const respondedCompanies = useMemo(() => {
    const counts: Record<string, number> = {}
    jobs
      .filter((j) => !['saved', 'researching', 'ready_to_apply', 'applied', 'rejected', 'closed'].includes(j.status))
      .forEach((j) => { counts[j.company] = (counts[j.company] ?? 0) + 1 })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }))
  }, [jobs])

  const highPriorityOpen = useMemo(
    () =>
      jobs
        .filter((j) => j.priority === 'high' && ACTIVE_STATUSES.includes(j.status))
        .slice(0, 5),
    [jobs],
  )

  const deadlinesThisWeek = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            !!j.deadline &&
            !['rejected', 'closed'].includes(j.status) &&
            daysUntil(j.deadline) >= 0 &&
            daysUntil(j.deadline) <= 7,
        )
        .sort((a, b) => a.deadline!.localeCompare(b.deadline!)),
    [jobs],
  )

  const staleApplications = useMemo(
    () =>
      jobs
        .filter((j) => j.status === 'applied' && daysSince(j.updatedAt) >= 14)
        .sort((a, b) => daysSince(b.updatedAt) - daysSince(a.updatedAt))
        .slice(0, 5),
    [jobs],
  )

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="p-8 max-w-6xl space-y-8">
        <div className="space-y-1">
          <div className="h-7 w-32 bg-zinc-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {metrics.total} job{metrics.total !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {/* ── Metric cards ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Total Jobs"
            value={metrics.total}
            sub={`${metrics.active} active in pipeline`}
          />
          <MetricCard
            label="Applications Sent"
            value={metrics.sent}
            sub={metrics.sent > 0 ? `${metrics.responseRate}% response rate` : 'No applications yet'}
          />
          <MetricCard
            label="Active Pipeline"
            value={metrics.active}
            sub={`${metrics.interviewed} in interview/final stage`}
          />
          <MetricCard
            label="Offers"
            value={metrics.offers}
            sub={metrics.offers > 0 ? 'Congratulations!' : 'Keep pushing'}
            accent={metrics.offers > 0 ? 'text-emerald-600' : undefined}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Response Rate"
            value={`${metrics.responseRate}%`}
            sub={`${metrics.responded} of ${metrics.sent} applications`}
            accent={metrics.responseRate >= 20 ? 'text-emerald-600' : metrics.responseRate > 0 ? 'text-amber-600' : undefined}
          />
          <MetricCard
            label="Interview Rate"
            value={`${metrics.interviewRate}%`}
            sub={`${metrics.interviewed} reached interview stage`}
            accent={metrics.interviewRate >= 10 ? 'text-emerald-600' : metrics.interviewRate > 0 ? 'text-amber-600' : undefined}
          />
          <MetricCard
            label="Rejection Rate"
            value={`${metrics.rejectionRate}%`}
            sub={`${metrics.rejected} rejection${metrics.rejected !== 1 ? 's' : ''} received`}
            accent={metrics.rejectionRate > 50 ? 'text-red-500' : undefined}
          />
        </div>
      </div>

      {/* ── Charts row 1: Status + Priority ── */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="Status Distribution" sub="all tracked jobs" className="col-span-2">
          {statusData.length === 0 ? (
            <ChartEmpty message="No jobs to display" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  width={120}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f4f5' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_CHART_COLORS[entry.s]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Priority Split">
          {priorityData.length === 0 ? (
            <ChartEmpty message="No priority data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_CHART_COLORS[entry.p]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2">
                {priorityData.map((d) => (
                  <div key={d.p} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: PRIORITY_CHART_COLORS[d.p] }}
                    />
                    <span className="text-xs text-zinc-500">{d.name} <span className="font-semibold text-zinc-900">{d.value}</span></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 2: Applications over time ── */}
      <ChartCard
        title="Applications Over Time"
        sub={appsOverTime.length > 0 ? `${metrics.sent} total applications` : undefined}
      >
        {appsOverTime.length === 0 ? (
          <ChartEmpty message="No application dates recorded — add an Applied Date to your jobs" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={appsOverTime} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={BLUE}
                strokeWidth={2}
                fill="url(#blueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: BLUE }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Charts row 3: Company + Location ── */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Top Companies" sub="by number of applications">
          {topCompanies.length === 0 ? (
            <ChartEmpty message="No company data" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, topCompanies.length * 28)}>
              <BarChart
                data={topCompanies}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + '…' : v}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f4f5' }} />
                <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top Locations" sub="by number of applications">
          {topLocations.length === 0 ? (
            <ChartEmpty message="No location data" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, topLocations.length * 28)}>
              <BarChart
                data={topLocations}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + '…' : v}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f4f5' }} />
                <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Insights ── */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Insights</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Companies that responded */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Companies That Responded
            </h3>
            {respondedCompanies.length === 0 ? (
              <p className="text-sm text-zinc-400">No responses yet — keep applying.</p>
            ) : (
              <ul className="space-y-2">
                {respondedCompanies.map(({ company, count }) => (
                  <li key={company} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900">{company}</span>
                    <span className="text-xs text-zinc-400">{count} active role{count !== 1 ? 's' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* High-priority open roles */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              High-Priority Open Roles
            </h3>
            {highPriorityOpen.length === 0 ? (
              <p className="text-sm text-zinc-400">No high-priority active applications.</p>
            ) : (
              <ul className="space-y-2">
                {highPriorityOpen.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-zinc-900 truncate block">{j.role}</span>
                      <span className="text-xs text-zinc-400">{j.company}</span>
                    </div>
                    <span className="text-xs text-red-500 font-medium shrink-0">High</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Deadlines this week */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Deadlines This Week
              {deadlinesThisWeek.length > 0 && (
                <span className="ml-2 text-amber-600">{deadlinesThisWeek.length}</span>
              )}
            </h3>
            {deadlinesThisWeek.length === 0 ? (
              <p className="text-sm text-zinc-400">No deadlines in the next 7 days.</p>
            ) : (
              <ul className="space-y-2">
                {deadlinesThisWeek.map((j) => {
                  const days = daysUntil(j.deadline!)
                  return (
                    <li key={j.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-zinc-900 truncate block">{j.company}</span>
                        <span className="text-xs text-zinc-400 truncate block">{j.role}</span>
                      </div>
                      <span className={`text-xs font-medium shrink-0 ${days === 0 ? 'text-red-500' : days <= 2 ? 'text-amber-600' : 'text-zinc-500'}`}>
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Stale applications */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Stale Applications
              {staleApplications.length > 0 && (
                <span className="ml-2 text-amber-600">{staleApplications.length}</span>
              )}
            </h3>
            {staleApplications.length === 0 ? (
              <p className="text-sm text-zinc-400">No stale applications — you&apos;re on top of it.</p>
            ) : (
              <ul className="space-y-2">
                {staleApplications.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-zinc-900 truncate block">{j.company}</span>
                      <span className="text-xs text-zinc-400 truncate block">{j.role}</span>
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {timeAgo(j.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
