import { useMemo } from 'react'
import { CHARACTERS, GAMES, getCharacter } from '../characters'
import { PLAYERS } from '../config'
import { total, winner, type Winner } from '../lib/coop'
import { formatNumber, formatTime, levelColor, parseTime } from '../lib/time'
import type { CoopRun } from '../types'
import { Portrait } from './Portrait'
import { CompareTable, StatsDeck, type StatPanel } from './StatsDeck'

type Player = 'thomas' | 'craig'
const PLAYER_KEYS: Player[] = ['thomas', 'craig']
const secs = (r: CoopRun) => parseTime(r.time) ?? 0
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const scoreOf = (r: CoopRun, p: Player) => (p === 'thomas' ? r.thomasScore : r.craigScore)

function PairRow({ r, onOpen, right }: { r: CoopRun; onOpen: (r: CoopRun) => void; right: React.ReactNode }) {
  return (
    <li onClick={() => onOpen(r)}>
      <Portrait id={r.thomas} size={28} />
      <Portrait id={r.craig} size={28} />
      <span className="grow">
        {getCharacter(r.thomas).label} + {getCharacter(r.craig).label}
      </span>
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
        winPct: `${Math.round((won.length / runs.length) * 100)}%`,
        avg: formatNumber(Math.round(avg(scores))),
        best: formatNumber(Math.max(...scores)),
        totalPts: formatNumber(scores.reduce((a, b) => a + b, 0)),
        margin: won.length ? formatNumber(Math.round(avg(won.map((r) => Math.abs(r.thomasScore - r.craigScore))))) : '-',
        longest: longest[p],
      }
    }
    const t = playerStats('thomas')
    const c = playerStats('craig')

    const individual = runs
      .flatMap((r) => PLAYER_KEYS.map((p) => ({ r, p, char: p === 'thomas' ? r.thomas : r.craig, score: scoreOf(r, p) })))
      .sort((a, b) => b.score - a.score)

    const charsFor = (p: Player) =>
      CHARACTERS.map((ch) => {
        const played = runs.filter((r) => (p === 'thomas' ? r.thomas : r.craig) === ch.id)
        return { ch, n: played.length, avgScore: avg(played.map((r) => scoreOf(r, p))), wins: played.filter((r) => winner(r) === p).length }
      })
        .filter((x) => x.n > 0)
        .sort((a, b) => b.avgScore - a.avgScore)

    const charLevels = CHARACTERS.map((ch) => {
      const played = runs.filter((r) => r.thomas === ch.id || r.craig === ch.id)
      return { ch, n: played.length, avgLevel: avg(played.map((r) => r.level)) }
    })
      .filter((x) => x.n > 0)
      .sort((a, b) => b.avgLevel - a.avgLevel)

    const gameGrid = GAMES.map((tg) =>
      GAMES.map((cg) => {
        const cell = runs.filter((r) => getCharacter(r.thomas).game === tg && getCharacter(r.craig).game === cg)
        return { n: cell.length, avgLevel: avg(cell.map((r) => r.level)) }
      }),
    )

    const times = runs.map(secs)
    const longestRun = runs[times.indexOf(Math.max(...times))]
    const shortestRun = runs[times.indexOf(Math.min(...times))]

    const playerName = (p: Player) => <span className={`${p}-text`}>{PLAYERS[p]}</span>

    const charColumn = (p: Player) => {
      const list = charsFor(p)
      return (
        <div>
          <h4>{playerName(p)} best</h4>
          <ol className="top-list compact">
            {list.slice(0, 4).map((x) => (
              <li key={x.ch.id}>
                <Portrait id={x.ch.id} size={24} />
                <span className="grow">{x.ch.label}</span>
                <strong>{formatNumber(Math.round(x.avgScore))}</strong>
              </li>
            ))}
          </ol>
          <h4>{playerName(p)} worst</h4>
          <ol className="top-list compact">
            {list.slice(-3).reverse().map((x) => (
              <li key={x.ch.id}>
                <Portrait id={x.ch.id} size={24} />
                <span className="grow">{x.ch.label}</span>
                <strong>{formatNumber(Math.round(x.avgScore))}</strong>
              </li>
            ))}
          </ol>
        </div>
      )
    }

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
                ['Wins', t.wins, c.wins],
                ['Win rate', t.winPct, c.winPct],
                ['Average score', t.avg, c.avg],
                ['Best score', t.best, c.best],
                ['Total points', t.totalPts, c.totalPts],
                ['Avg winning margin', t.margin, c.margin],
                ['Longest win streak', t.longest, c.longest],
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
                <Portrait id={char} size={28} />
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
        label: 'Best characters',
        render: () => (
          <>
            <p className="deck-note">Average individual score with each character.</p>
            <div className="two-col">
              {charColumn('thomas')}
              {charColumn('craig')}
            </div>
          </>
        ),
      },
      {
        id: 'levels',
        label: 'Character levels',
        render: () => (
          <>
            <p className="deck-note">Average level reached by runs including each character (either player).</p>
            <div className="two-col">
              {[charLevels.slice(0, 7), charLevels.slice(-7).reverse()].map((list, k) => (
                <div key={k}>
                  <h4>{k === 0 ? 'Strongest' : 'Weakest'}</h4>
                  <ol className="top-list compact">
                    {list.map((x) => (
                      <li key={x.ch.id}>
                        <Portrait id={x.ch.id} size={24} />
                        <span className="grow">{x.ch.label}</span>
                        <span className="muted">{x.n} {x.n === 1 ? 'run' : 'runs'}</span>
                        <strong>{x.avgLevel.toFixed(1)}</strong>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
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
                {GAMES.map((tg, ri) => (
                  <tr key={tg}>
                    <th>
                      <span className={`game-tag game-${tg.toLowerCase()}`}>{tg}</span>
                    </th>
                    {gameGrid[ri].map((cell, ci) => (
                      <td key={GAMES[ci]} style={cell.n ? { background: levelColor(cell.avgLevel) } : undefined}>
                        {cell.n ? (
                          <>
                            <strong>{cell.avgLevel.toFixed(1)}</strong>
                            <small>{cell.n} {cell.n === 1 ? 'run' : 'runs'}</small>
                          </>
                        ) : (
                          <small className="muted">-</small>
                        )}
                      </td>
                    ))}
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
  }, [runs, onOpen])

  return <StatsDeck panels={panels} />
}
