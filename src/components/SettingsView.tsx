import { useState } from 'react'
import { DATA_PATHS } from '../config'
import { readJsonFile } from '../lib/github'
import type { CoopRun, Settings, SoloRun } from '../types'

interface Props {
  settings: Settings
  onSave: (s: Settings) => void
  coopRuns: CoopRun[]
  soloRuns: SoloRun[]
}

export function SettingsView({ settings, onSave, coopRuns, soloRuns }: Props) {
  const [draft, setDraft] = useState(settings)
  const [status, setStatus] = useState<string | null>(null)

  async function test() {
    setStatus('Testing…')
    try {
      const { data } = await readJsonFile<unknown[]>(draft, DATA_PATHS.coop)
      setStatus(`✅ Connected. Found ${data.length} co-op runs in ${draft.owner}/${draft.repo}.`)
    } catch (e) {
      setStatus(`❌ ${(e as Error).message}`)
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ coop: coopRuns, solo: soloRuns }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sor4-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="view settings">
      <div className="panel">
        <h3>GitHub storage</h3>
        <p className="muted">
          Runs are stored as JSON in your GitHub repo and every save is a commit. Without a token the app is
          read-only. The token is kept only in this browser's local storage.
        </p>
        <form
          className="run-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ ...draft, token: draft.token.trim() })
            setStatus('Saved.')
          }}
        >
          <label className="span-2">
            Personal access token
            <input
              type="password"
              autoComplete="off"
              placeholder="github_pat_…"
              value={draft.token}
              onChange={(e) => setDraft({ ...draft, token: e.target.value })}
            />
          </label>
          <label>
            Owner
            <input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
          </label>
          <label>
            Repository
            <input value={draft.repo} onChange={(e) => setDraft({ ...draft, repo: e.target.value })} />
          </label>
          <label>
            Branch
            <input value={draft.branch} onChange={(e) => setDraft({ ...draft, branch: e.target.value })} />
          </label>
          <div className="form-actions span-2">
            <button type="button" className="btn ghost" onClick={test} disabled={!draft.token}>
              Test connection
            </button>
            <span className="spacer" />
            <button type="submit" className="btn primary">
              Save settings
            </button>
          </div>
          {status && <p className="span-2 muted">{status}</p>}
        </form>
      </div>
      <div className="panel">
        <h3>Backup</h3>
        <p className="muted">Download all runs as one JSON file.</p>
        <button className="btn" onClick={exportData}>
          ⬇ Export JSON
        </button>
      </div>
      <p className="credits muted">
        Character art from the{' '}
        <a href="https://streetsofrage.fandom.com/wiki/Streets_of_Rage_Wiki" target="_blank" rel="noreferrer">
          Streets of Rage Wiki
        </a>
        . Streets of Rage © SEGA. Streets of Rage 4 © Dotemu, Lizardcube, Guard Crush Games. Fan-made, personal use.
      </p>
    </section>
  )
}
