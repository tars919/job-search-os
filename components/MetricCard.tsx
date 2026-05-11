export function MetricCard({
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

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4 space-y-3 animate-pulse">
      <div className="h-3 w-24 bg-zinc-100 rounded" />
      <div className="h-8 w-12 bg-zinc-100 rounded" />
      <div className="h-3 w-32 bg-zinc-100 rounded" />
    </div>
  )
}
