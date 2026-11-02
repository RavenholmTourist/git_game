import { useState, type FormEvent } from 'react'
import { getCharacter } from '../characters'
import { normalizeTime } from '../lib/time'
import type { MoveVariant, SoloRun } from '../types'
import { CharacterSelect } from './CharacterSelect'
import { Modal } from './Modal'
import { toScore, validateStats, validScore } from '../lib/validation'
import { LevelTimeInputs } from './RunFields'

interface Props {
  runs: SoloRun[]
  initial: Partial<SoloRun>
  saving: boolean
  onSave: (run: SoloRun, isNew: boolean) => Promise<void>
  onDelete?: (run: SoloRun) => Promise<void>
  onClose: () => void
}

export function SoloRunForm({ runs, initial, saving, onSave, onDelete, onClose }: Props) {
  const editing = Boolean(initial.id)
  const [character, setCharacter] = useState(initial.character ?? '')
  const [blitz, setBlitz] = useState<MoveVariant>(initial.blitz ?? 'default')
  const [star, setStar] = useState<MoveVariant>(initial.star ?? 'default')
  const [stats, setStats] = useState({ level: String(initial.level ?? ''), time: initial.time ?? '' })
  const [score, setScore] = useState(String(initial.score ?? ''))
  const [error, setError] = useState<string | null>(null)

  const noAltBlitz = character !== '' && !getCharacter(character).hasAltBlitz
  const effectiveBlitz: MoveVariant = noAltBlitz ? 'default' : blitz
  const clash = runs.find(
    (r) => r.character === character && r.blitz === effectiveBlitz && r.star === star && r.id !== initial.id,
  )

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem =
      (!character ? 'Pick a character.' : null) ??
      (clash ? 'That combination is already logged.' : null) ??
      validateStats(stats) ??
      (!validScore(score) ? 'Score must be a whole number.' : null)
    if (problem) return setError(problem)
    try {
      await onSave(
        {
          id: initial.id ?? crypto.randomUUID(),
          loggedAt: initial.loggedAt ?? new Date().toISOString().slice(0, 19),
          character,
          blitz: effectiveBlitz,
          star,
          level: Number(stats.level),
          time: normalizeTime(stats.time)!,
          score: toScore(score),
        },
        !editing,
      )
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Modal title={editing ? 'Edit solo run' : 'Log solo run'} onClose={onClose}>
      <form className="run-form" onSubmit={submit}>
        <label className="span-2">
          Character
          <CharacterSelect value={character} onChange={setCharacter} />
        </label>
        <label>
          Blitz move
          <select value={effectiveBlitz} onChange={(e) => setBlitz(e.target.value as MoveVariant)}>
            <option value="default">Default Blitz</option>
            <option value="alternate" disabled={noAltBlitz}>
              Alternate Blitz{noAltBlitz ? ' (n/a for SoR1)' : ''}
            </option>
          </select>
        </label>
        <label>
          Star move
          <select value={star} onChange={(e) => setStar(e.target.value as MoveVariant)}>
            <option value="default">Default Star</option>
            <option value="alternate">Alternate Star</option>
          </select>
        </label>
        {clash && <p className="form-warning">This combination is already logged (Lvl {clash.level}).</p>}
        <LevelTimeInputs fields={stats} onChange={setStats} />
        <label className="span-2">
          Total score
          <input inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} required />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          {editing && onDelete && (
            <button
              type="button"
              className="btn danger"
              disabled={saving}
              onClick={async () => {
                if (!confirm('Delete this run?')) return
                try {
                  await onDelete(initial as SoloRun)
                  onClose()
                } catch (err) {
                  setError((err as Error).message)
                }
              }}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save run'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
