import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface StatPanel {
  id: string
  label: string
  render: () => ReactNode
}

const SWIPE_PX = 50

export function StatsDeck({ panels }: { panels: StatPanel[] }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState<'left' | 'right'>('left')
  const start = useRef<{ x: number; y: number } | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const i = Math.min(index, panels.length - 1)
  const panel = panels[i]

  const go = (next: number, d: 'left' | 'right') => {
    setDir(d)
    setIndex((next + panels.length) % panels.length)
  }

  useEffect(() => {
    const el = tabsRef.current?.children[i] as HTMLElement | undefined
    const tabs = tabsRef.current
    if (el && tabs) tabs.scrollTo({ left: el.offsetLeft - tabs.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' })
  }, [i])

  if (!panel) return null
  return (
    <div className="stats-deck">
      <div className="deck-tabs" ref={tabsRef} role="tablist">
        {panels.map((p, k) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={k === i}
            className={k === i ? 'active' : ''}
            onClick={() => go(k, k < i ? 'right' : 'left')}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        className="deck-body"
        onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = start.current
          start.current = null
          if (!s) return
          const dx = e.clientX - s.x
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
            if (dx < 0) go(i + 1, 'left')
            else go(i - 1, 'right')
          }
        }}
        onPointerCancel={() => (start.current = null)}
      >
        <button className="deck-arrow" onClick={() => go(i - 1, 'right')} aria-label="Previous stats">
          ‹
        </button>
        <div key={panel.id} className={`deck-panel slide-${dir}`} role="tabpanel">
          <h3>{panel.label}</h3>
          {panel.render()}
        </div>
        <button className="deck-arrow" onClick={() => go(i + 1, 'left')} aria-label="Next stats">
          ›
        </button>
      </div>
      <div className="deck-dots">
        {panels.map((p, k) => (
          <span key={p.id} className={k === i ? 'active' : ''} />
        ))}
      </div>
    </div>
  )
}

export function CompareTable({ rows, left, right }: { rows: [string, ReactNode, ReactNode][]; left: ReactNode; right: ReactNode }) {
  return (
    <table className="compare-table">
      <thead>
        <tr>
          <th />
          <th>{left}</th>
          <th>{right}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, a, b]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{a}</td>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
