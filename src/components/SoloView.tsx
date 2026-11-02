import { useMemo, useState } from 'react'
import { CHARACTERS, getCharacter, isGameBoundary } from '../characters'
import type { RunStore } from '../lib/useRunStore'
import { formatNumber, levelColor, pickRandom, sumTimes } from '../lib/time'
import type { MoveVariant, SoloRun } from '../types'
import { Portrait } from './Portrait'
import { CharacterFace, ScratchCard } from './ScratchCard'
import { SoloRunForm } from './SoloRunForm'
import { Progress, StatCard } from './Stats'

interface Combo {
  blitz: MoveVariant
  star: MoveVariant
}

const COMBOS: Combo[] = [
  { blitz: 'default', star: 'default' },
  { blitz: 'alternate', star: 'default' },
  { blitz: 'default', star: 'alternate' },
  { blitz: 'alternate', star: 'alternate' },
]

const cap = (v: MoveVariant) => (v === 'default' ? 'Default' : 'Alternate')
const key = (id: string, c: Combo) => `${id}|${c.blitz}|${c.star}`
const comboLabel = (c: Combo) => `${cap(c.blitz)} Blitz / ${cap(c.star)} Star`
const runLabel = (r: { character: string } & Combo) => `${getCharacter(r.character).label} | ${comboLabel(r)}`

const VALID = CHARACTERS.flatMap((ch) =>
  COMBOS.filter((c) => ch.hasAltBlitz || c.blitz === 'default').map((c) => ({ character: ch.id, ...c })),
)

export function SoloView({ store }: { store: RunStore<SoloRun> }) {
  const { runs, saving, mutate } = store
  const [form, setForm] = useState<Partial<SoloRun> | null>(null)
  const [suggestion, setSuggestion] = useState<({ character: string } & Combo) | null>(null)
  const [revealed, setRevealed] = useState({ character: false, combo: false })
  const [rollId, setRollId] = useState(0)
  const fullyRevealed = revealed.character && revealed.combo

  const byKey = useMemo(() => new Map(runs.map((r) => [key(r.character, r), r])), [runs])
  const best = useMemo(() => [...runs].sort((a, b) => b.score - a.score).slice(0, 5), [runs])
  const allDone = VALID.every((v) => byKey.has(key(v.character, v)))

  function roll() {
    setSuggestion(pickRandom(VALID.filter((v) => !byKey.has(key(v.character, v)))))
    setRevealed({ character: false, combo: false })
    setRollId((n) => n + 1)
  }

  async function save(run: SoloRun, isNew: boolean) {
    await mutate(
      (all) => (isNew ? [...all, run] : all.map((r) => (r.id === run.id ? run : r))),
      `${isNew ? 'Log' : 'Edit'} solo run: ${runLabel(run)} - Lvl ${run.level}`,
    )
    if (suggestion && key(suggestion.character, suggestion) === key(run.character, run)) setSuggestion(null)
  }

  async function remove(run: SoloRun) {
    await mutate((all) => all.filter((r) => r.id !== run.id), `Delete solo run: ${runLabel(run)}`)
  }

  return (
    <section className="view">
      <div className="dashboard">
        <div className="stat-stack">
          <StatCard label="Progress" value={<Progress done={runs.length} total={VALID.length} />} />
          <div className="stat-row tight">
            <StatCard label="Time played" value={sumTimes(runs.map((r) => r.time))} />
            <StatCard label="Highest level" value={runs.length ? Math.max(...runs.map((r) => r.level)) : '-'} />
            <StatCard label="Best score" value={best[0] ? formatNumber(best[0].score) : '-'} />
          </div>
        </div>
        <div className="randomizer">
          <div className="randomizer-head">
            <h3>Next random run</h3>
            <button className="btn primary" onClick={roll} disabled={allDone}>
              🎲 Roll
            </button>
          </div>
          {allDone ? (
            <p className="muted">Challenge complete!</p>
          ) : suggestion ? (
            <div className="suggestion">
              <div className="scratch-row">
                <ScratchCard
                  key={`ch${rollId}`}
                  title="Character"
                  accent="var(--yellow)"
                  revealed={revealed.character}
                  onReveal={() => setRevealed((r) => ({ ...r, character: true }))}
                >
                  <CharacterFace {...getCharacter(suggestion.character)} />
                </ScratchCard>
                <ScratchCard
                  key={`co${rollId}`}
                  title="Moves"
                  accent="var(--red)"
                  revealed={revealed.combo}
                  locked={!revealed.character}
                  lockedHint="Character first"
                  onReveal={() => setRevealed((r) => ({ ...r, combo: true }))}
                >
                  <span className={`chip big ${suggestion.blitz}`}>{cap(suggestion.blitz)} Blitz</span>
                  <span className={`chip big ${suggestion.star}`}>{cap(suggestion.star)} Star</span>
                </ScratchCard>
              </div>
              {fullyRevealed ? (
                <button className="btn" onClick={() => setForm({ ...suggestion })}>
                  Log this run
                </button>
              ) : (
                <p className="muted scratch-hint">
                  Scratch or tap the {revealed.character ? 'moves' : 'character'} card to reveal
                </p>
              )}
            </div>
          ) : (
            <p className="muted">Roll for an unplayed character + move combo.</p>
          )}
        </div>
      </div>

      <div className="matrix-toolbar">
        <h3>Character × Blitz / Star</h3>
        <button className="btn primary" onClick={() => setForm({})}>
          + Log run
        </button>
      </div>

      <div className="matrix-scroll">
        <table className="matrix solo">
          <thead>
            <tr>
              <th className="corner">Character</th>
              {COMBOS.map((c) => (
                <th key={key('', c)} className="col-head combo-head">
                  <span className={`chip ${c.blitz}`}>{cap(c.blitz)} Blitz</span>
                  <span className={`chip ${c.star}`}>{cap(c.star)} Star</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHARACTERS.map((ch, ri) => (
              <tr key={ch.id} className={isGameBoundary(ri) ? 'boundary' : ''}>
                <th className="row-head">
                  <Portrait id={ch.id} size={34} showName />
                </th>
                {COMBOS.map((c) => {
                  const blocked = !ch.hasAltBlitz && c.blitz === 'alternate'
                  const run = byKey.get(key(ch.id, c))
                  const isSuggested = fullyRevealed && suggestion && key(suggestion.character, suggestion) === key(ch.id, c)
                  if (blocked)
                    return (
                      <td key={key(ch.id, c)} className="cell blocked" title="SoR1 characters have no Alternate Blitz">
                        <span>N/A</span>
                      </td>
                    )
                  return (
                    <td
                      key={key(ch.id, c)}
                      className={`cell ${run ? 'played' : 'open'} ${isSuggested ? 'suggested' : ''}`}
                    >
                      <button
                        style={run ? { background: levelColor(run.level) } : undefined}
                        onClick={() => setForm(run ?? { character: ch.id, ...c })}
                        title={`${ch.label} | ${comboLabel(c)}`}
                      >
                        {run ? (
                          <span className="solo-cell">
                            <strong>Lvl {run.level}</strong>
                            <span>{run.time}</span>
                            <span>{formatNumber(run.score)}</span>
                          </span>
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

      {best.length > 0 && (
        <div className="panels">
          <div className="panel">
            <h3>Top runs</h3>
            <ol className="top-list">
              {best.map((r) => (
                <li key={r.id} onClick={() => setForm(r)}>
                  <Portrait id={r.character} size={28} />
                  <span className="grow">{runLabel(r)}</span>
                  <span className="muted">Lvl {r.level}</span>
                  <strong>{formatNumber(r.score)}</strong>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {form && (
        <SoloRunForm
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
