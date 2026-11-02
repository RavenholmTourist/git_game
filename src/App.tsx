import { useEffect, useState } from 'react'
import { CoopView } from './components/CoopView'
import { SettingsView } from './components/SettingsView'
import { SoloView } from './components/SoloView'
import { DEFAULT_SETTINGS } from './config'
import { useRunStore } from './lib/useRunStore'
import type { CoopRun, Settings, SoloRun } from './types'

type Tab = 'coop' | 'solo' | 'settings'
const TABS: { id: Tab; label: string }[] = [
  { id: 'coop', label: 'Co-op' },
  { id: 'solo', label: 'Solo Deep' },
  { id: 'settings', label: 'Settings' },
]
const SETTINGS_KEY = 'sor4.settings'

function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function tabFromHash(): Tab {
  const h = window.location.hash.slice(1)
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'coop'
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const coop = useRunStore<CoopRun>('coop', settings)
  const solo = useRunStore<SoloRun>('solo', settings)

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function saveSettings(s: Settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
    setSettings(s)
  }

  const active = tab === 'solo' ? solo : coop
  const error = coop.error ?? solo.error

  return (
    <div className="app">
      <header className="hero" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}img/hero.jpg)` }}>
        <div className="hero-inner">
          <img className="logo" src={`${import.meta.env.BASE_URL}img/logo.png`} alt="Streets of Rage 4" />
          <div className="hero-title">
            <h1>Survival Tracker</h1>
            <span className={`sync-pill ${active.source}`}>
              {active.saving
                ? 'Saving to GitHub…'
                : active.loading
                  ? 'Loading…'
                  : active.source === 'github'
                    ? '● Synced with GitHub'
                    : '○ Read-only: add token in Settings'}
            </span>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={tab === t.id ? 'active' : ''}>
              {t.label}
            </a>
          ))}
        </nav>
      </header>
      {error && (
        <div className="banner-error">
          {error}{' '}
          <button className="btn ghost small" onClick={() => void (coop.error ? coop.reload() : solo.reload())}>
            Retry
          </button>
        </div>
      )}
      <main>
        {tab === 'coop' && <CoopView store={coop} />}
        {tab === 'solo' && <SoloView store={solo} />}
        {tab === 'settings' && (
          <SettingsView settings={settings} onSave={saveSettings} coopRuns={coop.runs} soloRuns={solo.runs} />
        )}
      </main>
    </div>
  )
}
