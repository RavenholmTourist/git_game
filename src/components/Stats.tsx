import type { ReactNode } from 'react'

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0
  return (
    <div className="progress" title={`${done} / ${total}`}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
      <span className="progress-text">
        {done} / {total} ({pct.toFixed(1)}%)
      </span>
    </div>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
