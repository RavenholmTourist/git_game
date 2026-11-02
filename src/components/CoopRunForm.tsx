import { useState, type FormEvent } from 'react'
import { getCharacter } from '../characters'
import { normalizeTime } from '../lib/time'
import type { CoopRun } from '../types'
import { CharacterSelect } from './CharacterSelect'
import { Modal } from './Modal'
import { toScore, validateStats, validScore } from '../lib/validation'
import { LevelTimeInputs } from './RunFields'

interface Props {
  runs: CoopRun[]
  initial: Partial<CoopRun>
  saving: boolean
  onSave: (run: CoopRun, isNew: boolean) => Promise<void>
  onDelete?: (run: CoopRun) => Promise<void>
  onClose: () => void
}

export function CoopRunForm({ runs, initial, saving, onSave, onDelete, onClose }: Props) {
  const editing = Boolean(initial.id)
  const [thomas, setThomas] = useState(initial.thomas ?? '')
  const [craig, setCraig] = useState(initial.craig ?? '')
  const [stats, setStats] = useState({ level: String(initial.level ?? ''), time: initial.time ?? '' })
  const [tScore, setTScore] = useState(String(initial.thomasScore ?? ''))
  const [cScore, setCScore] = useState(String(initial.craigScore ?? ''))
  const [error, setError] = useState<string | null>(null)

  const clash = runs.find((r) => r.thomas === thomas && r.craig === craig && r.id !== initial.id)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem =
      (!thomas || !craig ? 'Pick both characters.' : null) ??
      (clash ? 'That pairing is already logged.' : null) ??
      validateStats(stats) ??
      (!validScore(tScore) || !validScore(cScore) ? 'Scores must be whole numbers.' : null)
    if (problem) return setError(problem)
    try {
      await onSave(
        {
          id: initial.id ?? crypto.randomUUID(),
          loggedAt: initial.loggedAt ?? new Date().toISOString().slice(0, 19),
          thomas,
          craig,
          level: Number(stats.level),
          time: normalizeTime(stats.time)!,
          thomasScore: toScore(tScore),
          craigScore: toScore(cScore),
        },
        !editing,
      )
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Modal title={editing ? 'Edit co-op run' : 'Log co-op run'} onClose={onClose}>
      <form className="run-form" onSubmit={submit}>
        <label>
          Thomas's character
          <CharacterSelect value={thomas} onChange={setThomas} />
        </label>
        <label>
          Craig's character
          <CharacterSelect value={craig} onChange={setCraig} />
        </label>
        {clash && (
          <p className="form-warning">
            {getCharacter(thomas).label} + {getCharacter(craig).label} is already logged (Lvl {clash.level}).
          </p>
        )}
        <LevelTimeInputs fields={stats} onChange={setStats} />
        <label>
          Thomas's score
          <input inputMode="numeric" value={tScore} onChange={(e) => setTScore(e.target.value)} required />
        </label>
        <label>
          Craig's score
          <input inputMode="numeric" value={cScore} onChange={(e) => setCScore(e.target.value)} required />
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
                  await onDelete(initial as CoopRun)
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
