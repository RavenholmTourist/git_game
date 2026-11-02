import { useMemo } from 'react'
import { GAMES, getCharacter } from '../characters'
import { formatNumber, formatTime, parseTime } from '../lib/time'
import type { MoveVariant, SoloRun } from '../types'
import { Portrait } from './Portrait'
import { StatsDeck, type StatPanel } from './StatsDeck'

const cap = (v: MoveVariant) => (v === 'default' ? 'Default' : 'Alternate')
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const COMBOS: [MoveVariant, MoveVariant][] = [
  ['default', 'default'],
  ['alternate', 'default'],
  ['default', 'alternate'],
  ['alternate', 'alternate'],
]

function RunRow({ r, onOpen, right }: { r: SoloRun; onOpen: (r: SoloRun) => void; right: React.ReactNode }) {
  return (
    <li onClick={() => onOpen(r)}>
      <Portrait id={r.character} size={28} />
      <span className="grow">
        {getCharacter(r.character).label} <span className="muted">· {cap(r.blitz)[0]}B / {cap(r.star)[0]}S</span>
      </span>
      {right}
    </li>
  )
}

export function SoloStats({ runs, onOpen }: { runs: SoloRun[]; onOpen: (r: SoloRun) => void }) {
  const panels = useMemo<StatPanel[]>(() => {
    if (!runs.length) return []
    const byScore = [...runs].sort((a, b) => b.score - a.score)
    const byLevel = [...runs].sort((a, b) => b.level - a.level || b.score - a.score)
    const recent = [...runs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, 8)
    const times = runs.map((r) => parseTime(r.time) ?? 0)
    const group = (rows: { key: string; label: React.ReactNode; list: SoloRun[] }[]) => (
      <table className="compare-table wide">
        <thead>
          <tr>
            <th />
            <th>Runs</th>
            <th>Avg level</th>
            <th>Best score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, list }) => (
            <tr key={key}>
              <th>{label}</th>
              <td>{list.length}</td>
              <td>{list.length ? avg(list.map((r) => r.level)).toFixed(1) : '-'}</td>
              <td>{list.length ? formatNumber(Math.max(...list.map((r) => r.score))) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
    return [
      {
        id: 'top',
        label: 'Top scores',
        render: () => (
          <ol className="top-list">
            {byScore.slice(0, 6).map((r) => (
              <RunRow key={r.id} r={r} onOpen={onOpen} right={<><span className="muted">Lvl {r.level}</span><strong>{formatNumber(r.score)}</strong></>} />
            ))}
          </ol>
        ),
      },
      {
        id: 'deepest',
        label: 'Deepest runs',
        render: () => (
          <ol className="top-list">
            {byLevel.slice(0, 6).map((r) => (
              <RunRow key={r.id} r={r} onOpen={onOpen} right={<><span className="muted">{r.time}</span><strong>Lvl {r.level}</strong></>} />
            ))}
          </ol>
        ),
      },
      {
        id: 'combos',
        label: 'By move combo',
        render: () =>
          group(
            COMBOS.map(([b, s]) => ({
              key: `${b}${s}`,
              label: (
                <>
                  <span className={`chip ${b}`}>{cap(b)} Blitz</span> <span className={`chip ${s}`}>{cap(s)} Star</span>
                </>
              ),
              list: runs.filter((r) => r.blitz === b && r.star === s),
            })),
          ),
      },
      {
        id: 'games',
        label: 'By game',
        render: () =>
          group(
            GAMES.map((g) => ({
              key: g,
              label: <span className={`game-tag game-${g.toLowerCase()}`}>{g}</span>,
              list: runs.filter((r) => getCharacter(r.character).game === g),
            })),
          ),
      },
      {
        id: 'records',
        label: 'Records',
        render: () => (
          <div className="record-grid">
            <div><span className="stat-label">Runs logged</span><strong>{runs.length}</strong></div>
            <div><span className="stat-label">Average level</span><strong>{avg(runs.map((r) => r.level)).toFixed(1)}</strong></div>
            <div><span className="stat-label">Average run time</span><strong>{formatTime(Math.round(avg(times)))}</strong></div>
            <div><span className="stat-label">Average score</span><strong>{formatNumber(Math.round(avg(runs.map((r) => r.score))))}</strong></div>
            <div><span className="stat-label">Longest run</span><strong>{formatTime(Math.max(...times))}</strong></div>
            <div><span className="stat-label">Total points</span><strong>{formatNumber(runs.reduce((a, r) => a + r.score, 0))}</strong></div>
          </div>
        ),
      },
      {
        id: 'recent',
        label: 'Recent runs',
        render: () => (
          <ol className="top-list">
            {recent.map((r) => (
              <RunRow
                key={r.id}
                r={r}
                onOpen={onOpen}
                right={<><span className="muted">{new Date(r.loggedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><strong>Lvl {r.level}</strong></>}
              />
            ))}
          </ol>
        ),
      },
    ]
  }, [runs, onOpen])

  return <StatsDeck panels={panels} />
}
