import { useMemo, useState } from 'react'
import { CHARACTERS, getCharacter, isGameBoundary } from '../characters'
import { PLAYERS } from '../config'
import type { RunStore } from '../lib/useRunStore'
import { formatNumber, levelColor, pickRandom, sumTimes } from '../lib/time'
import type { CoopRun } from '../types'
import { CoopRunForm } from './CoopRunForm'
import { Portrait } from './Portrait'
import { Progress, SegmentedControl, StatCard } from './Stats'

type CellMode = 'level' | 'score' | 'time'
type Winner = 'thomas' | 'craig' | 'tie'

const key = (t: string, c: string) => `${t}|${c}`
const total = (r: CoopRun) => r.thomasScore + r.craigScore
const winner = (r: CoopRun): Winner =>
  r.thomasScore > r.craigScore ? 'thomas' : r.craigScore > r.thomasScore ? 'craig' : 'tie'
const pairLabel = (t: string, c: string) => `${getCharacter(t).label} (T) + ${getCharacter(c).label} (C)`

export function CoopView({ store }: { store: RunStore<CoopRun> }) {
  const { runs, saving, mutate } = store
  const [mode, setMode] = useState<CellMode>('level')
  const [form, setForm] = useState<Partial<CoopRun> | null>(null)
  const [suggestion, setSuggestion] = useState<{ thomas: string; craig: string } | null>(null)
  const [hover, setHover] = useState<{ t: string; c: string } | null>(null)

  const byPair = useMemo(() => new Map(runs.map((r) => [key(r.thomas, r.craig), r])), [runs])
  const wins = useMemo(() => {
    const w = { thomas: 0, craig: 0, tie: 0 }
    runs.forEach((r) => w[winner(r)]++)
    return w
  }, [runs])
  const best = useMemo(() => [...runs].sort((a, b) => total(b) - total(a)).slice(0, 5), [runs])
  const leaderboard = useMemo(() => {
    return CHARACTERS.map((c) => {
      const played = runs.filter((r) => r.thomas === c.id || r.craig === c.id)
      const avg = played.length ? played.reduce((a, r) => a + r.level, 0) / played.length : 0
      return { c, played: played.length, avg }
    })
      .filter((x) => x.played > 0)
      .sort((a, b) => b.avg - a.avg)
  }, [runs])

  function roll() {
    const open = CHARACTERS.flatMap((t) =>
      CHARACTERS.filter((c) => !byPair.has(key(t.id, c.id))).map((c) => ({ thomas: t.id, craig: c.id })),
    )
    setSuggestion(pickRandom(open))
  }

  async function save(run: CoopRun, isNew: boolean) {
    const verb = isNew ? 'Log' : 'Edit'
    await mutate(
      (all) => (isNew ? [...all, run] : all.map((r) => (r.id === run.id ? run : r))),
      `${verb} co-op run: ${pairLabel(run.thomas, run.craig)} - Lvl ${run.level}`,
    )
    if (suggestion && suggestion.thomas === run.thomas && suggestion.craig === run.craig) setSuggestion(null)
  }

  async function remove(run: CoopRun) {
    await mutate((all) => all.filter((r) => r.id !== run.id), `Delete co-op run: ${pairLabel(run.thomas, run.craig)}`)
  }

  const allDone = runs.length >= CHARACTERS.length ** 2

  return (
    <section className="view">
      <div className="dashboard">
        <div className="scoreboard">
          <div className={`score-side thomas ${wins.thomas > wins.craig ? 'leading' : ''}`}>
            <span className="score-name">{PLAYERS.thomas}</span>
            <span className="score-num">{wins.thomas}</span>
          </div>
          <div className="score-vs">
            <span>WINS</span>
            {wins.tie > 0 && <small>{wins.tie} tie{wins.tie > 1 ? 's' : ''}</small>}
          </div>
          <div className={`score-side craig ${wins.craig > wins.thomas ? 'leading' : ''}`}>
            <span className="score-num">{wins.craig}</span>
            <span className="score-name">{PLAYERS.craig}</span>
          </div>
        </div>
        <div className="randomizer">
          <div className="randomizer-head">
            <h3>Next random pairing</h3>
            <button className="btn primary" onClick={roll} disabled={allDone}>
              🎲 Roll
            </button>
          </div>
          {allDone ? (
            <p className="muted">Challenge complete!</p>
          ) : suggestion ? (
            <div className="suggestion">
              <div className="suggestion-pair">
                <div>
                  <small className="thomas-text">{PLAYERS.thomas}</small>
                  <Portrait id={suggestion.thomas} size={56} showName />
                </div>
                <span className="plus">+</span>
                <div>
                  <small className="craig-text">{PLAYERS.craig}</small>
                  <Portrait id={suggestion.craig} size={56} showName />
                </div>
              </div>
              <button className="btn" onClick={() => setForm({ ...suggestion })}>
                Log this run
              </button>
            </div>
          ) : (
            <p className="muted">Roll for an unplayed pairing. It's highlighted on the matrix.</p>
          )}
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Progress" value={<Progress done={runs.length} total={CHARACTERS.length ** 2} />} />
        <StatCard label="Time played" value={sumTimes(runs.map((r) => r.time))} />
        <StatCard
          label="Highest level"
          value={runs.length ? Math.max(...runs.map((r) => r.level)) : '-'}
          sub={best[0] && `Best total ${formatNumber(total(best[0]))}`}
        />
      </div>

      <div className="matrix-toolbar">
        <h3>
          <span className="thomas-text">{PLAYERS.thomas}</span> ↓ vs <span className="craig-text">{PLAYERS.craig}</span> →
        </h3>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'level', label: 'Level' },
            { value: 'score', label: 'Total score' },
            { value: 'time', label: 'Time' },
          ]}
        />
        <button className="btn primary" onClick={() => setForm({})}>
          + Log run
        </button>
      </div>

      <div className="matrix-scroll">
        <table className="matrix coop" data-mode={mode} onMouseLeave={() => setHover(null)}>
          <thead>
            <tr>
              <th className="corner">
                <span className="thomas-text">T</span> \ <span className="craig-text">C</span>
              </th>
              {CHARACTERS.map((c, ci) => (
                <th
                  key={c.id}
                  className={`col-head ${isGameBoundary(ci) ? 'boundary' : ''} ${hover?.c === c.id ? 'hl' : ''}`}
                >
                  <Portrait id={c.id} size={34} />
                  <span className="col-label">
                    <span className={`game-tag game-${c.game.toLowerCase()}`}>{c.game}</span>
                    {c.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHARACTERS.map((t, ri) => (
              <tr key={t.id} className={isGameBoundary(ri) ? 'boundary' : ''}>
                <th className={`row-head ${hover?.t === t.id ? 'hl' : ''}`}>
                  <Portrait id={t.id} size={30} showName />
                </th>
                {CHARACTERS.map((c, ci) => {
                  const run = byPair.get(key(t.id, c.id))
                  const isSuggested = suggestion?.thomas === t.id && suggestion?.craig === c.id
                  const cls = [
                    'cell',
                    run ? 'played' : 'open',
                    isGameBoundary(ci) ? 'boundary' : '',
                    isSuggested ? 'suggested' : '',
                    hover && (hover.t === t.id || hover.c === c.id) ? 'crosshair' : '',
                  ].join(' ')
                  return (
                    <td key={c.id} className={cls}>
                      <button
                        style={run ? { background: levelColor(run.level) } : undefined}
                        onMouseEnter={() => setHover({ t: t.id, c: c.id })}
                        onClick={() => setForm(run ?? { thomas: t.id, craig: c.id })}
                        title={
                          run
                            ? `${pairLabel(t.id, c.id)}\nLvl ${run.level} · ${run.time}\nThomas ${formatNumber(run.thomasScore)} · Craig ${formatNumber(run.craigScore)}\nTotal ${formatNumber(total(run))}`
                            : `${pairLabel(t.id, c.id)}\nNot played yet - click to log`
                        }
                      >
                        {run ? (
                          <>
                            <span className="cell-main">
                              {mode === 'level'
                                ? run.level
                                : mode === 'score'
                                  ? `${Math.round(total(run) / 1000)}k`
                                  : run.time.replace(/^00:/, '')}
                            </span>
                            <span className={`winner-dot ${winner(run)}`}>
                              {winner(run) === 'tie' ? '=' : winner(run) === 'thomas' ? 'T' : 'C'}
                            </span>
                          </>
                        ) : (
                          <span className="cell-plus">+</span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Top runs (combined score)</h3>
          <ol className="top-list">
            {best.map((r) => (
              <li key={r.id} onClick={() => setForm(r)}>
                <Portrait id={r.thomas} size={28} />
                <Portrait id={r.craig} size={28} />
                <span className="grow">
                  {getCharacter(r.thomas).label} + {getCharacter(r.craig).label}
                </span>
                <span className="muted">Lvl {r.level}</span>
                <strong>{formatNumber(total(r))}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel">
          <h3>Character average level</h3>
          <ol className="top-list compact">
            {leaderboard.slice(0, 10).map(({ c, played, avg }) => (
              <li key={c.id}>
                <Portrait id={c.id} size={24} />
                <span className="grow">{c.label}</span>
                <span className="muted">{played} runs</span>
                <strong>{avg.toFixed(1)}</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {form && (
        <CoopRunForm
          key={form.id ?? 'new'}
          runs={runs}
          initial={form}
          saving={saving}
          onSave={save}
          onDelete={remove}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  )
}
