import { useMemo, useState } from 'react'
import { CHARACTERS, GAMES, getCharacter, type Game } from '../characters'
import { PLAYERS } from '../config'
import { total, winner, type Winner } from '../lib/coop'
import { formatNumber, formatTime, levelColor, parseTime } from '../lib/time'
import type { CoopRun } from '../types'
import { Portrait } from './Portrait'
import { SegmentedControl } from './Stats'
import type { ReactNode } from 'react'
import { CompareTable, StatsDeck, type StatPanel } from './StatsDeck'

type Player = 'thomas' | 'craig'
const secs = (r: CoopRun) => parseTime(r.time) ?? 0
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const scoreOf = (r: CoopRun, p: Player) => (p === 'thomas' ? r.thomasScore : r.craigScore)
const letter = (p: Player) => (p === 'thomas' ? 'T' : 'C')

function PortraitBadge({ id, p }: { id: string; p: Player }) {
  return (
    <span className="portrait-badge">
      <Portrait id={id} size={30} />
      <span className={`winner-dot ${p}`}>{letter(p)}</span>
    </span>
  )
}

// Winner on the left; dots show which player each portrait belongs to.
function PairRow({ r, onOpen, right }: { r: CoopRun; onOpen: (r: CoopRun) => void; right: ReactNode }) {
  const w = winner(r)
  const first: Player = w === 'craig' ? 'craig' : 'thomas'
  const second: Player = first === 'thomas' ? 'craig' : 'thomas'
  return (
    <li onClick={() => onOpen(r)}>
      <PortraitBadge id={r[first]} p={first} />
      <PortraitBadge id={r[second]} p={second} />
      <span className="grow" />
      {right}
    </li>
  )
}

function WinTag({ w }: { w: Winner }) {
  return <span className={`winner-dot inline ${w}`}>{w === 'tie' ? '=' : w === 'thomas' ? 'T' : 'C'}</span>
}

function streaks(runs: CoopRun[]) {
  const ordered = [...runs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
  const longest = { thomas: 0, craig: 0 }
  let cur: { who: Winner; n: number } = { who: 'tie', n: 0 }
  for (const r of ordered) {
    const w = winner(r)
    cur = w === cur.who ? { who: w, n: cur.n + 1 } : { who: w, n: 1 }
    if (w !== 'tie') longest[w] = Math.max(longest[w], cur.n)
  }
  return { longest, current: cur }
}

export function CoopStats({ runs, onOpen }: { runs: CoopRun[]; onOpen: (r: CoopRun) => void }) {
  const [who, setWho] = useState<'all' | Player>('all')
  const panels = useMemo<StatPanel[]>(() => {
    if (!runs.length) return []
    const byTotal = [...runs].sort((a, b) => total(b) - total(a))
    const byLevel = [...runs].sort((a, b) => b.level - a.level || secs(b) - secs(a))
    const margins = [...runs].sort((a, b) => Math.abs(a.thomasScore - a.craigScore) - Math.abs(b.thomasScore - b.craigScore))
    const recent = [...runs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, 8)
    const { longest, current } = streaks(runs)

    const playerStats = (p: Player) => {
      const scores = runs.map((r) => scoreOf(r, p))
      const won = runs.filter((r) => winner(r) === p)
      return {
        wins: won.length,
        winPct: (won.length / runs.length) * 100,
        avg: avg(scores),
        best: Math.max(...scores),
        totalPts: scores.reduce((a, b) => a + b, 0),
        margin: won.length ? avg(won.map((r) => Math.abs(r.thomasScore - r.craigScore))) : null,
        longest: longest[p],
      }
    }
    const t = playerStats('thomas')
    const c = playerStats('craig')
    const h2h = (a: number, b: number): Player | null => (a > b ? 'thomas' : b > a ? 'craig' : null)

    const individual = runs
      .flatMap((r) => (['thomas', 'craig'] as Player[]).map((p) => ({ r, p, char: p === 'thomas' ? r.thomas : r.craig, score: scoreOf(r, p) })))
      .sort((a, b) => b.score - a.score)

    const charStats = (p: 'all' | Player) =>
      CHARACTERS.map((ch) => {
        const entries = runs.flatMap((r) => {
          const out: { level: number; score: number }[] = []
          if ((p === 'all' || p === 'thomas') && r.thomas === ch.id) out.push({ level: r.level, score: r.thomasScore })
          if ((p === 'all' || p === 'craig') && r.craig === ch.id) out.push({ level: r.level, score: r.craigScore })
          return out
        })
        return { ch, n: entries.length, avgLevel: avg(entries.map((e) => e.level)), avgScore: avg(entries.map((e) => e.score)) }
      })
        .filter((x) => x.n > 0)
        .sort((a, b) => b.avgLevel - a.avgLevel)

    const gameGrid = (tg: Game, cg: Game) => {
      const cell = runs.filter((r) => getCharacter(r.thomas).game === tg && getCharacter(r.craig).game === cg)
      return { n: cell.length, avgLevel: avg(cell.map((r) => r.level)) }
    }

    const multiNames = [...new Set(CHARACTERS.map((ch) => ch.name))].filter(
      (n) => CHARACTERS.filter((ch) => ch.name === n).length > 1,
    )
    const latestOf = (name: string) => CHARACTERS.find((ch) => ch.name === name)!.id
    const nameGrid = (tn: string, cn: string) => {
      const cell = runs.filter((r) => getCharacter(r.thomas).name === tn && getCharacter(r.craig).name === cn)
      return { n: cell.length, avgLevel: avg(cell.map((r) => r.level)) }
    }

    const times = runs.map(secs)
    const longestRun = runs[times.indexOf(Math.max(...times))]
    const shortestRun = runs[times.indexOf(Math.min(...times))]

    const playerName = (p: Player) => <span className={`${p}-text`}>{PLAYERS[p]}</span>

    return [
      {
        id: 'h2h',
        label: 'Head to head',
        render: () => (
          <>
            <CompareTable
              left={playerName('thomas')}
              right={playerName('craig')}
              rows={[
                ['Wins', t.wins, c.wins, h2h(t.wins, c.wins)],
                ['Win rate', `${Math.round(t.winPct)}%`, `${Math.round(c.winPct)}%`, h2h(t.winPct, c.winPct)],
                ['Average score', formatNumber(Math.round(t.avg)), formatNumber(Math.round(c.avg)), h2h(t.avg, c.avg)],
                ['Best score', formatNumber(t.best), formatNumber(c.best), h2h(t.best, c.best)],
                ['Total points', formatNumber(t.totalPts), formatNumber(c.totalPts), h2h(t.totalPts, c.totalPts)],
                [
                  'Avg winning margin',
                  t.margin === null ? '-' : formatNumber(Math.round(t.margin)),
                  c.margin === null ? '-' : formatNumber(Math.round(c.margin)),
                  t.margin === null || c.margin === null ? null : h2h(t.margin, c.margin),
                ],
                ['Longest win streak', t.longest, c.longest, h2h(t.longest, c.longest)],
              ]}
            />
            {current.who !== 'tie' && (
              <p className="deck-note">
                Current streak: {playerName(current.who)} has won {current.n} in a row
              </p>
            )}
          </>
        ),
      },
      {
        id: 'pairs',
        label: 'Best pairs',
        render: () => (
          <ol className="top-list">
            {byTotal.slice(0, 6).map((r) => (
              <PairRow key={r.id} r={r} onOpen={onOpen} right={<><span className="muted">Lvl {r.level}</span><strong>{formatNumber(total(r))}</strong></>} />
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
              <PairRow key={r.id} r={r} onOpen={onOpen} right={<><span className="muted">{r.time}</span><strong>Lvl {r.level}</strong></>} />
            ))}
          </ol>
        ),
      },
      {
        id: 'high',
        label: 'High scores',
        render: () => (
          <ol className="top-list">
            {individual.slice(0, 8).map(({ r, p, char, score }) => (
              <li key={`${r.id}-${p}`} onClick={() => onOpen(r)}>
                <PortraitBadge id={char} p={p} />
                <span className="grow">
                  {playerName(p)} <span className="muted">as</span> {getCharacter(char).label}
                </span>
                <span className="muted">Lvl {r.level}</span>
                <strong>{formatNumber(score)}</strong>
              </li>
            ))}
          </ol>
        ),
      },
      {
        id: 'chars',
        label: 'Characters',
        render: () => (
          <>
            <SegmentedControl
              value={who}
              options={[
                { value: 'all', label: 'Combined' },
                { value: 'thomas', label: 'Thomas' },
                { value: 'craig', label: 'Craig' },
              ]}
              onChange={setWho}
            />
            <p className="deck-note">
              {who === 'all' ? 'Every run featuring each character, by either player.' : `Runs where ${PLAYERS[who]} played each character.`}
            </p>
            <table className="compare-table wide">
              <thead>
                <tr>
                  <th />
                  <th>Runs</th>
                  <th>Avg level</th>
                  <th>Avg score</th>
                </tr>
              </thead>
              <tbody>
                {charStats(who).map((x) => (
                  <tr key={x.ch.id}>
                    <th>
                      <Portrait id={x.ch.id} size={26} /> {x.ch.label}
                    </th>
                    <td>{x.n}</td>
                    <td>{x.avgLevel.toFixed(1)}</td>
                    <td>{formatNumber(Math.round(x.avgScore))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: 'margins',
        label: 'Close calls',
        render: () => (
          <div className="two-col">
            {[
              { title: 'Closest finishes', list: margins.slice(0, 4) },
              { title: 'Biggest blowouts', list: margins.slice(-4).reverse() },
            ].map(({ title, list }) => (
              <div key={title}>
                <h4>{title}</h4>
                <ol className="top-list">
                  {list.map((r) => (
                    <PairRow
                      key={r.id}
                      r={r}
                      onOpen={onOpen}
                      right={<><WinTag w={winner(r)} /><strong>{formatNumber(Math.abs(r.thomasScore - r.craigScore))}</strong></>}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'games',
        label: 'Game vs game',
        render: () => (
          <>
            <p className="deck-note">
              Average level by {playerName('thomas')}'s game (rows) vs {playerName('craig')}'s game (columns).
            </p>
            <table className="game-grid">
              <thead>
                <tr>
                  <th />
                  {GAMES.map((g) => (
                    <th key={g}>
                      <span className={`game-tag game-${g.toLowerCase()}`}>{g}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GAMES.map((tg) => (
                  <tr key={tg}>
                    <th>
                      <span className={`game-tag game-${tg.toLowerCase()}`}>{tg}</span>
                    </th>
                    {GAMES.map((cg) => {
                      const cell = gameGrid(tg, cg)
                      return (
                        <td key={cg} style={cell.n ? { background: levelColor(cell.avgLevel) } : undefined}>
                          {cell.n ? (
                            <>
                              <strong>{cell.avgLevel.toFixed(1)}</strong>
                              <small>{cell.n} {cell.n === 1 ? 'run' : 'runs'}</small>
                            </>
                          ) : (
                            <small className="muted">-</small>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: 'names',
        label: 'Char vs char',
        render: () => (
          <>
            <p className="deck-note">
              Average level when {playerName('thomas')} (rows) faces {playerName('craig')} (columns), all versions of each
              character combined.
            </p>
            <table className="game-grid">
              <thead>
                <tr>
                  <th />
                  {multiNames.map((n) => (
                    <th key={n}>
                      <Portrait id={latestOf(n)} size={34} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {multiNames.map((tn) => (
                  <tr key={tn}>
                    <th>
                      <Portrait id={latestOf(tn)} size={34} />
                    </th>
                    {multiNames.map((cn) => {
                      const cell = nameGrid(tn, cn)
                      return (
                        <td key={cn} style={cell.n ? { background: levelColor(cell.avgLevel) } : undefined}>
                          {cell.n ? (
                            <>
                              <strong>{cell.avgLevel.toFixed(1)}</strong>
                              <small>{cell.n} {cell.n === 1 ? 'run' : 'runs'}</small>
                            </>
                          ) : (
                            <small className="muted">-</small>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
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
            <div><span className="stat-label">Average combined</span><strong>{formatNumber(Math.round(avg(runs.map(total))))}</strong></div>
            <div onClick={() => onOpen(longestRun)} className="clickable">
              <span className="stat-label">Longest run</span><strong>{longestRun.time}</strong>
              <small>{getCharacter(longestRun.thomas).label} + {getCharacter(longestRun.craig).label}</small>
            </div>
            <div onClick={() => onOpen(shortestRun)} className="clickable">
              <span className="stat-label">Shortest run</span><strong>{shortestRun.time}</strong>
              <small>{getCharacter(shortestRun.thomas).label} + {getCharacter(shortestRun.craig).label}</small>
            </div>
          </div>
        ),
      },
      {
        id: 'recent',
        label: 'Recent runs',
        render: () => (
          <ol className="top-list">
            {recent.map((r) => (
              <PairRow
                key={r.id}
                r={r}
                onOpen={onOpen}
                right={<><span className="muted">{new Date(r.loggedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><span className="muted">Lvl {r.level}</span><WinTag w={winner(r)} /></>}
              />
            ))}
          </ol>
        ),
      },
    ]
  }, [runs, onOpen, who])

  return <StatsDeck panels={panels} />
}
